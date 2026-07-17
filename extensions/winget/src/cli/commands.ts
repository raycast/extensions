/**
 * Typed winget command API.
 *
 * Flag policy (accumulated knowledge — do not change casually):
 * - All commands: --disable-interactivity --accept-source-agreements
 * - install/repair: + --accept-package-agreements --silent, retried once
 *   WITHOUT --silent when the failure is the requires-administrator class
 *   (silent mode suppresses some installers' UAC elevation prompt)
 * - upgrade: + --accept-package-agreements, NO --silent (some installers need
 *   an interactive elevation prompt that silent mode suppresses)
 * - uninstall: base flags only (--accept-package-agreements is invalid here);
 *   --force only with explicit caller opt-in (user-confirmed — forced removal
 *   deletes a modified portable package's user changes)
 * - upgrade: retried once WITH --force when a modified portable package
 *   refuses removal (winget's own printed remedy; an upgrade replaces the
 *   package either way)
 * - install/upgrade/uninstall/repair: when every unelevated attempt fails
 *   with the requires-administrator class, winget itself is relaunched
 *   elevated (the UAC prompt is the user's confirmation)
 * - install/upgrade/uninstall/repair: installer exit code 1618 (Windows
 *   Installer mutex busy — an earlier install still finishing in the
 *   background) is retried once after a wait
 * - download/import: + --accept-package-agreements, no --silent
 * - Every targeted operation: --exact --id <id> --source <source>
 */

import { closeSync, fstatSync, openSync, readSync } from "node:fs";

import {
  CancelledError,
  COMMAND_REQUIRES_ADMIN,
  getExitCodeMessage,
  NO_APPLICATIONS_FOUND,
  PORTABLE_UNINSTALL_FAILED,
  toUnsignedHResult,
} from "./errors";
import {
  interpretOperationResult,
  parseInstalledPackages,
  parsePackageDetails,
  parsePinnedPackages,
  parseSearchResults,
  parseUpgradePackages,
  parseVersionList,
  type TableParseResult,
} from "./parser";
import { WingetProgressDetector } from "./progress";
import { runWinget, runWingetElevated, UAC_DECLINED_EXIT_CODE, withQuerySlot } from "./spawn";
import {
  type WingetExecutorOptions,
  type WingetInstalledPackage,
  type WingetOperationResult,
  type WingetPackageDetails,
  type WingetPinnedPackage,
  type WingetSearchPackage,
  type WingetSource,
  type WingetUpgradePackage,
  type WingetVersionList,
} from "./types";

const BASE_FLAGS = ["--disable-interactivity", "--accept-source-agreements"];
const PACKAGE_AGREEMENT_FLAGS = ["--accept-package-agreements"];
const SILENT_FLAGS = ["--silent"];
const EXACT_ID_FLAGS = ["--exact", "--id"];

const INSTALL_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS, ...SILENT_FLAGS];
const UPGRADE_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];
/** install/repair elevation-retry flags: the same no---silent set. */
const ELEVATION_RETRY_FLAGS = UPGRADE_FLAGS;
const REPAIR_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS, ...SILENT_FLAGS];
const UNINSTALL_FLAGS = [...BASE_FLAGS];
const DOWNLOAD_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];
const IMPORT_FLAGS = [...BASE_FLAGS, ...PACKAGE_AGREEMENT_FLAGS];

const CATALOG_TIMEOUT_MS = 180_000;
const QUERY_TIMEOUT_MS = 120_000;
const DETAILS_TIMEOUT_MS = 30_000;

function withSource(args: string[], source: WingetSource): string[] {
  return [...args, "--source", source];
}

// ---------------------------------------------------------------------------
// Failure-message enrichment
// ---------------------------------------------------------------------------

/**
 * Resolve a human-readable description for an HRESULT-ish error code that was
 * embedded in winget OUTPUT (codes from the exit-code map are already
 * resolved). Falls back to asking `winget error <code>`.
 */
async function resolveErrorDescriptionViaCli(errorCode: string, signal?: AbortSignal): Promise<string | undefined> {
  // Negative decimal codes would parse as a flag-like argv token; winget
  // accepts the hex form for both.
  let code = errorCode.trim();
  if (/^-\d+$/.test(code)) {
    code = `0x${toUnsignedHResult(Number.parseInt(code, 10)).toString(16).toUpperCase()}`;
  }
  try {
    const result = await runWinget(["error", code], {
      timeout: 10_000,
      signal,
    });
    if (result.exitCode !== 0) return undefined;
    const lines = (result.stdout || result.stderr)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    return lines.find((l) => !/^0x[0-9a-f]+$/i.test(l) && !/^-?\d+$/.test(l));
  } catch {
    return undefined;
  }
}

/**
 * Silent-mode markers of "the app is open" aborts. Inno Setup suppresses its
 * "close all instances" prompt under /SILENT, auto-answers Cancel, and exits
 * with a generic code — the real cause is only in the installer log.
 */
const APP_RUNNING_LOG_MARKERS = [/is currently running/i, /close all instances/i];

/**
 * Bounded read of an installer log's tail. MSI logs are UTF-16LE (BOM at the
 * start of the file, checked separately from the tail read); Inno logs are
 * plain text.
 */
function readInstallerLogTail(filePath: string, maxBytes = 256 * 1024): string | null {
  try {
    const fd = openSync(filePath, "r");
    try {
      const bom = Buffer.alloc(2);
      const utf16 = readSync(fd, bom, 0, 2, 0) === 2 && bom[0] === 0xff && bom[1] === 0xfe;
      const size = fstatSync(fd).size;
      let length = Math.min(size, maxBytes);
      if (utf16 && (size - length) % 2 !== 0) {
        length -= 1; // keep the read aligned to whole UTF-16 code units
      }
      const buffer = Buffer.alloc(length);
      readSync(fd, buffer, 0, length, size - length);
      return buffer.toString(utf16 ? "utf16le" : "utf8");
    } finally {
      closeSync(fd);
    }
  } catch {
    return null;
  }
}

/** Append installer-log location and a CLI-resolved description where useful. */
async function enrichFailureMessage(
  result: WingetOperationResult,
  signal?: AbortSignal,
): Promise<WingetOperationResult> {
  if (result.success) return result;

  let message = result.message;
  // Resolve a bare hex code into a human-readable description.
  if (result.errorCode && (!message || /^WinGet exited with code/.test(message))) {
    const description = await resolveErrorDescriptionViaCli(result.errorCode, signal);
    if (description) {
      message = description;
    }
  }
  // A generic installer exit code with a log: check the log for the
  // app-is-open abort, which silent mode reports no other way.
  if (result.installerLogPath && message && /^Installer failed with exit code/.test(message)) {
    const tail = readInstallerLogTail(result.installerLogPath);
    if (tail && APP_RUNNING_LOG_MARKERS.some((marker) => marker.test(tail))) {
      message = "App in use, close it first";
    }
  }
  if (message && result.installerLogPath) {
    message = `${message}. Installer log: ${result.installerLogPath}`;
  }
  return { ...result, message };
}

// ---------------------------------------------------------------------------
// Core executors
// ---------------------------------------------------------------------------

/**
 * Elevated execution: no output crosses the elevation boundary, so the result
 * comes from the exit code alone (locale-independent, same interpretation
 * table as normal runs). Failure enrichment still applies — `winget error`
 * runs unelevated.
 */
async function executeElevatedOperation(
  args: string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  options.onElevated?.();
  try {
    const execResult = await runWingetElevated(args, { onSpawn: options.onSpawn });
    if (execResult.exitCode === UAC_DECLINED_EXIT_CODE) {
      // The same failure class as INSTALL_CANCELLED_BY_USER — a decline is a
      // per-package failure, not a caller cancellation.
      return {
        success: false,
        message: "Cancelled in the UAC prompt",
        exitCode: execResult.exitCode,
      };
    }
    const result = interpretOperationResult(execResult.exitCode, "");
    return enrichFailureMessage(result, options.signal);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function executeOperation(args: string[], options: WingetExecutorOptions = {}): Promise<WingetOperationResult> {
  const detector = new WingetProgressDetector((state) => options.onProgress?.(state));

  try {
    const execResult = await runWinget(args, {
      signal: options.signal,
      timeout: options.timeout,
      staleWatchdog: true,
      onSpawn: options.onSpawn,
      onStdout: (chunk) => detector.feed(chunk),
      onStderr: (chunk) => detector.feed(chunk),
    });
    detector.flush();
    const result = interpretOperationResult(execResult.exitCode, detector.getBuffer());
    return enrichFailureMessage(result, options.signal);
  } catch (error) {
    if (error instanceof CancelledError) {
      return {
        success: false,
        cancelled: true,
        message: "Operation was cancelled",
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

async function isWingetAvailable(): Promise<boolean> {
  try {
    const result = await runWinget(["--version"], { timeout: 10_000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * The full catalog. Requires an explicit empty query — winget lists the whole
 * source only for `search -q ""` (and cmd.exe would drop the empty arg, which
 * is one reason we spawn winget directly).
 */
async function searchAllPackages(signal?: AbortSignal): Promise<TableParseResult<WingetSearchPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["search", "-q", "", ...BASE_FLAGS], {
      timeout: CATALOG_TIMEOUT_MS,
      signal,
    });
    return parseSearchResults(result.stdout);
  });
}

async function listInstalledPackages(signal?: AbortSignal): Promise<TableParseResult<WingetInstalledPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parseInstalledPackages(result.stdout);
  });
}

async function listUpgradePackages(signal?: AbortSignal): Promise<TableParseResult<WingetUpgradePackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["upgrade", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parseUpgradePackages(result.stdout);
  });
}

async function listPinnedPackages(signal?: AbortSignal): Promise<TableParseResult<WingetPinnedPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["pin", "list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return parsePinnedPackages(result.stdout);
  });
}

interface MutableData {
  installed: WingetInstalledPackage[];
  upgradable: WingetUpgradePackage[];
  pinned: WingetPinnedPackage[];
  droppedTruncatedIds: number;
}

/**
 * The three mutable slices, fetched concurrently as ONE consistent snapshot —
 * used where a decision joins across slices (upgrade-all preflight). Index
 * refreshes use core/refresh.refreshSlicesIncrementally instead, which
 * commits each slice as it arrives. Queries are read-only and winget handles
 * parallel invocations; measured on a 290-package system: 19.4 s sequential
 * vs 12.5 s concurrent (winget self-contends on its source index, so the win
 * is ~35%, not 3x).
 */
async function fetchMutableData(signal?: AbortSignal): Promise<MutableData> {
  const [installed, upgradable, pinned] = await Promise.all([
    listInstalledPackages(signal),
    listUpgradePackages(signal),
    listPinnedPackages(signal),
  ]);
  return {
    installed: installed.items,
    upgradable: upgradable.items,
    pinned: pinned.items,
    droppedTruncatedIds:
      installed.stats.droppedTruncatedIds + upgradable.stats.droppedTruncatedIds + pinned.stats.droppedTruncatedIds,
  };
}

async function showPackageDetails(
  id: string,
  source: WingetSource,
  signal?: AbortSignal,
): Promise<WingetPackageDetails | null> {
  return withQuerySlot(async () => {
    const result = await runWinget(withSource(["show", ...EXACT_ID_FLAGS, id, ...BASE_FLAGS], source), {
      timeout: DETAILS_TIMEOUT_MS,
      signal,
    });
    const details = parsePackageDetails(result.stdout);
    if (details === null && result.exitCode !== 0 && toUnsignedHResult(result.exitCode) !== NO_APPLICATIONS_FOUND) {
      // Transient failure (network/source), not a definitive "no such
      // package" — throw so callers don't cache the absence.
      throw new Error(getExitCodeMessage(result.exitCode) ?? "Failed to load package details");
    }
    return details;
  });
}

async function showPackageVersions(
  id: string,
  source: WingetSource,
  signal?: AbortSignal,
): Promise<WingetVersionList | null> {
  return withQuerySlot(async () => {
    const result = await runWinget(withSource(["show", ...EXACT_ID_FLAGS, id, "--versions", ...BASE_FLAGS], source), {
      timeout: DETAILS_TIMEOUT_MS,
      signal,
    });
    const versions = parseVersionList(result.stdout);
    if (versions === null && result.exitCode !== 0 && toUnsignedHResult(result.exitCode) !== NO_APPLICATIONS_FOUND) {
      // Transient failure (network/source), not a definitive "no such
      // package" — throw so callers don't cache the absence.
      throw new Error(getExitCodeMessage(result.exitCode) ?? "Failed to load package versions");
    }
    return versions;
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Windows deployment error ERROR_PACKAGED_SERVICE_REQUIRES_ADMIN_PRIVILEGES:
 * a machine-scope MSIX package can only be installed by an elevated winget.
 * winget relays it as the installer's exit code, so it appears both as a
 * process exit code and inside "Installer failed with exit code" messages.
 */
const PACKAGED_SERVICE_REQUIRES_ADMIN = 0x80073d28;

/**
 * The requires-administrator failure class: winget's silent mode blocks the
 * installer's UAC prompt for some packages (the root cause behind upgrade's
 * no---silent policy), and machine-scope MSIX packages need winget itself
 * elevated. Anchored to locale-independent signals: the winget exit code, the
 * curated message from the failure-pattern catalog (matched as a prefix —
 * enrichment appends the installer-log path), or installer exit codes 740
 * (ERROR_ELEVATION_REQUIRED) and 0x80073D28. A free-text scan would
 * over-trigger on enriched content such as log paths under
 * C:\Users\Administrator.
 */
function isElevationFailure(result: WingetOperationResult): boolean {
  if (result.success || result.cancelled) return false;
  if (result.exitCode !== undefined) {
    const code = toUnsignedHResult(result.exitCode);
    if (code === COMMAND_REQUIRES_ADMIN || code === PACKAGED_SERVICE_REQUIRES_ADMIN) {
      return true;
    }
  }
  const message = result.message ?? "";
  return (
    message.startsWith("Requires administrator") ||
    /exit code:?\s*740\b/i.test(message) ||
    /0x80073d28\b/i.test(message)
  );
}

/**
 * ERROR_INSTALL_ALREADY_RUNNING: the Windows Installer mutex was held by
 * another installation when this one started. Common mid-bulk — an earlier
 * package's installer can leave a background msiexec finishing after winget
 * already reported success.
 */
const INSTALLER_BUSY_EXIT_CODE = "1618";
const INSTALLER_BUSY_RETRY_DELAY_MS = 30_000;

function isInstallerBusyFailure(result: WingetOperationResult): boolean {
  return !result.success && !result.cancelled && result.errorCode === INSTALLER_BUSY_EXIT_CODE;
}

/** Resolves "elapsed" after `ms`, or "aborted" as soon as the signal fires. */
function delay(ms: number, signal?: AbortSignal): Promise<"elapsed" | "aborted"> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve("aborted");
      return;
    }
    const finish = (outcome: "elapsed" | "aborted") => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      resolve(outcome);
    };
    const onAbort = () => finish("aborted");
    const timer = setTimeout(() => finish("elapsed"), ms);
    signal?.addEventListener("abort", onAbort);
  });
}

/**
 * Retry once when the installer failed only because the Windows Installer
 * mutex was busy — a transient collision, not a package problem. The wait
 * gives the other installation time to finish; a cancel during the wait
 * returns the original failure immediately.
 */
async function executeWithBusyRetry(
  run: () => Promise<WingetOperationResult>,
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await run();
  if (!isInstallerBusyFailure(result)) {
    return result;
  }
  if ((await delay(INSTALLER_BUSY_RETRY_DELAY_MS, options.signal)) === "aborted") {
    return result;
  }
  return run();
}

/**
 * Last-resort retry for the requires-administrator class: relaunch winget
 * itself elevated. The UAC prompt is the confirmation — no dialog precedes
 * it — and a decline surfaces as a normal per-package failure, so bulk runs
 * carry on with the next package. `elevatedArgs` is a thunk resolved after
 * `run` settles, so retry chains can elevate with the arguments of whichever
 * attempt ran last (e.g. upgrade's --force retry).
 */
async function executeWithElevatedFallback(
  run: () => Promise<WingetOperationResult>,
  elevatedArgs: () => string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await run();
  if (!isElevationFailure(result)) {
    return result;
  }
  return executeElevatedOperation(elevatedArgs(), options);
}

/**
 * Run an install/repair invocation silent-first; when it fails with the
 * requires-administrator class, retry once without --silent so the installer
 * can raise its own UAC prompt, then fall back to relaunching winget itself
 * elevated (machine-scope MSIX packages accept nothing less).
 */
async function executeWithElevationRetry(
  argsFor: (flags: string[]) => string[],
  silentFlags: string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await executeOperation(argsFor(silentFlags), options);
  if (!isElevationFailure(result)) {
    return result;
  }
  return executeWithElevatedFallback(
    () => executeOperation(argsFor(ELEVATION_RETRY_FLAGS), options),
    () => argsFor(silentFlags),
    options,
  );
}

async function installPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeWithBusyRetry(
    () =>
      executeWithElevationRetry(
        (flags) => withSource(["install", ...EXACT_ID_FLAGS, id, ...flags], source),
        INSTALL_FLAGS,
        options,
      ),
    options,
  );
}

/**
 * Install a specific version, then add a blocking pin (version installs are
 * always pinned so upgrades don't undo the chosen version).
 * A pin failure never masks the install result — the install succeeded.
 */
async function installPackageVersion(
  id: string,
  version: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const result = await executeWithBusyRetry(
    () =>
      executeWithElevationRetry(
        (flags) => withSource(["install", ...EXACT_ID_FLAGS, id, "--version", version, ...flags], source),
        INSTALL_FLAGS,
        options,
      ),
    options,
  );
  if (!result.success) {
    return result;
  }

  const pinResult = await executeOperation(
    withSource(["pin", "add", ...EXACT_ID_FLAGS, id, "--blocking", ...BASE_FLAGS], source),
    { signal: options.signal, onSpawn: options.onSpawn },
  );
  if (pinResult.cancelled) {
    // The install itself completed — never report it as not having happened,
    // but disclose that the auto-pin was skipped.
    return {
      ...result,
      message: `Installed ${version}, but the auto-pin was skipped (cancelled). Pin it manually to keep this version`,
    };
  }
  if (!pinResult.success && !pinResult.noop) {
    return {
      ...result,
      message: `Installed ${version}, but pinning failed${pinResult.message ? `. ${pinResult.message}` : ""}`,
    };
  }
  return result;
}

/**
 * Upgrade-specific exit-code remap: with a `--source` filter, winget reports
 * an installed-but-up-to-date package as NO_APPLICATIONS_FOUND ("No installed
 * package found matching input criteria") instead of UPDATE_NOT_APPLICABLE —
 * verified live (winget 1.28: 0x8A15002B without --source, 0x8A150014 with).
 * For an upgrade that is a no-op, not a failure. (For uninstall the same code
 * genuinely means "not installed" and stays a failure.)
 */
function remapUpgradeNotFound(result: WingetOperationResult): WingetOperationResult {
  if (
    !result.success &&
    !result.cancelled &&
    result.exitCode !== undefined &&
    toUnsignedHResult(result.exitCode) === NO_APPLICATIONS_FOUND
  ) {
    return {
      ...result,
      success: true,
      noop: true,
      message: "No applicable update",
      errorCode: undefined,
    };
  }
  return result;
}

/**
 * Portable packages modified after install refuse removal during upgrade or
 * uninstall ("Unable to remove Portable package as it has been modified; to
 * override this check use --force") — winget's printed guidance is --force.
 * Matched by the PORTABLE_UNINSTALL_FAILED exit code (locale-independent) or
 * the curated/raw message wording (English output).
 */
function isModifiedPortableFailure(result: WingetOperationResult): boolean {
  if (result.success || result.cancelled) return false;
  if (result.exitCode !== undefined && toUnsignedHResult(result.exitCode) === PORTABLE_UNINSTALL_FAILED) {
    return true;
  }
  const message = result.message ?? "";
  return /portable package/i.test(message) && /modified/i.test(message);
}

/**
 * Run an upgrade invocation normally; when it fails because a portable
 * package was modified after install, retry once with --force (the remedy
 * winget itself prints — an upgrade replaces the package either way). The
 * success message discloses the override. Uninstall deliberately does NOT
 * auto-force: forced removal deletes the user's modifications, so it runs
 * only after the runner's explicit confirmation prompt.
 */
async function executeWithForceRetry(
  argsFor: (extra: string[]) => string[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const result = await executeOperation(argsFor([]), options);
  if (!isModifiedPortableFailure(result)) {
    return result;
  }
  const retried = await executeOperation(argsFor(["--force"]), options);
  if (retried.success && !retried.noop) {
    // Append rather than replace: a successful retry can carry its own
    // message (e.g. "Restart your PC to finish") that must stay visible.
    const disclosure = "modified portable package, used --force";
    return {
      ...retried,
      message: retried.message ? `${retried.message} (${disclosure})` : "Modified portable package, used --force",
    };
  }
  return retried;
}

async function upgradePackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  // Track the last attempt's arguments so an elevated retry keeps the
  // --force flag when the force retry is what hit the administrator wall.
  let lastAttemptArgs = withSource(["upgrade", ...EXACT_ID_FLAGS, id, ...UPGRADE_FLAGS], source);
  const argsFor = (extra: string[]) =>
    (lastAttemptArgs = withSource(["upgrade", ...EXACT_ID_FLAGS, id, ...UPGRADE_FLAGS, ...extra], source));
  const result = await executeWithBusyRetry(
    () =>
      executeWithElevatedFallback(
        () => executeWithForceRetry(argsFor, options),
        () => lastAttemptArgs,
        options,
      ),
    options,
  );
  return remapUpgradeNotFound(result);
}

/**
 * `version` is required when multiple versions of the package are installed —
 * winget refuses an ambiguous uninstall ("Multiple versions of this package
 * are installed"). Callers pass the row's installed version in that case.
 * `force` overrides the modified-portable-package check; it is destructive
 * (deletes the user's modifications) and must be user-confirmed upstream.
 */
async function uninstallPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
  version?: string,
  force = false,
): Promise<WingetOperationResult> {
  const versionFlags = version ? ["--version", version] : [];
  const forceFlags = force ? ["--force"] : [];
  const args = withSource(
    ["uninstall", ...EXACT_ID_FLAGS, id, ...versionFlags, ...UNINSTALL_FLAGS, ...forceFlags],
    source,
  );
  return executeWithBusyRetry(
    () =>
      executeWithElevatedFallback(
        () => executeOperation(args, options),
        () => args,
        options,
      ),
    options,
  );
}

async function repairPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeWithBusyRetry(
    () =>
      executeWithElevationRetry(
        (flags) => withSource(["repair", ...EXACT_ID_FLAGS, id, ...flags], source),
        REPAIR_FLAGS,
        options,
      ),
    options,
  );
}

async function downloadInstaller(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(withSource(["download", ...EXACT_ID_FLAGS, id, ...DOWNLOAD_FLAGS], source), options);
}

async function pinPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(
    withSource(["pin", "add", ...EXACT_ID_FLAGS, id, "--blocking", ...BASE_FLAGS], source),
    options,
  );
}

async function unpinPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  return executeOperation(withSource(["pin", "remove", ...EXACT_ID_FLAGS, id, ...BASE_FLAGS], source), options);
}

async function exportPackages(
  outputPath: string,
  includeVersions: boolean,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const args = ["export", "-o", outputPath, ...BASE_FLAGS];
  if (includeVersions) {
    args.push("--include-versions");
  }
  return executeOperation(args, options);
}

async function importPackages(
  inputPath: string,
  options: {
    ignoreUnavailable?: boolean;
    ignoreVersions?: boolean;
    noUpgrade?: boolean;
  } & WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const args = ["import", "-i", inputPath, ...IMPORT_FLAGS];
  if (options.ignoreUnavailable) args.push("--ignore-unavailable");
  if (options.ignoreVersions) args.push("--ignore-versions");
  if (options.noUpgrade) args.push("--no-upgrade");
  return executeOperation(args, options);
}

export {
  isElevationFailure,
  isInstallerBusyFailure,
  isModifiedPortableFailure,
  remapUpgradeNotFound,
  downloadInstaller,
  exportPackages,
  fetchMutableData,
  importPackages,
  installPackage,
  installPackageVersion,
  isWingetAvailable,
  listInstalledPackages,
  listPinnedPackages,
  listUpgradePackages,
  pinPackage,
  repairPackage,
  searchAllPackages,
  showPackageDetails,
  showPackageVersions,
  uninstallPackage,
  unpinPackage,
  upgradePackage,
  type MutableData,
};
