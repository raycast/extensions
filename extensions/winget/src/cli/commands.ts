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
  CTRL_SIGNAL_RECEIVED,
  DOWNLOAD_FAILED,
  getExitCodeMessage,
  INSTALL_CANCELLED_BY_USER,
  INSTALL_DISK_FULL,
  INSTALL_FILE_IN_USE,
  INSTALL_INSTALL_IN_PROGRESS,
  INSTALL_INSUFFICIENT_MEMORY,
  INSTALL_NO_NETWORK,
  INSTALL_PACKAGE_IN_USE,
  INSTALL_PACKAGE_IN_USE_BY_APPLICATION,
  INSTALL_REBOOT_REQUIRED_FOR_INSTALL,
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
  type ExecutorResult,
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
      onSilence: (silentMinutes) => options.onProgress?.({ type: "stalled", silentMinutes }),
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
 * A zero-row parse plus a nonzero exit means the query itself failed (source
 * update error, cache corruption) — not that the table was empty. Throw so
 * callers keep their previous data instead of caching the failure as absence;
 * same contract as the showPackage* transient-failure guards.
 * NO_APPLICATIONS_FOUND is winget's own "nothing matched" answer, the one
 * legitimate empty-table exit (empty `pin list` and no-upgrades exit 0).
 */
function ensureTableQuerySucceeded<T>(
  result: ExecutorResult,
  parsed: TableParseResult<T>,
  fallbackMessage: string,
): TableParseResult<T> {
  if (
    parsed.items.length === 0 &&
    result.exitCode !== 0 &&
    toUnsignedHResult(result.exitCode) !== NO_APPLICATIONS_FOUND
  ) {
    throw new Error(getExitCodeMessage(result.exitCode) ?? fallbackMessage);
  }
  return parsed;
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
    return ensureTableQuerySucceeded(result, parseSearchResults(result.stdout), "Failed to load the package catalog");
  });
}

async function listInstalledPackages(signal?: AbortSignal): Promise<TableParseResult<WingetInstalledPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return ensureTableQuerySucceeded(
      result,
      parseInstalledPackages(result.stdout),
      "Failed to list installed packages",
    );
  });
}

async function listUpgradePackages(signal?: AbortSignal): Promise<TableParseResult<WingetUpgradePackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["upgrade", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return ensureTableQuerySucceeded(result, parseUpgradePackages(result.stdout), "Failed to list available updates");
  });
}

async function listPinnedPackages(signal?: AbortSignal): Promise<TableParseResult<WingetPinnedPackage>> {
  return withQuerySlot(async () => {
    const result = await runWinget(["pin", "list", ...BASE_FLAGS], {
      timeout: QUERY_TIMEOUT_MS,
      signal,
    });
    return ensureTableQuerySucceeded(result, parsePinnedPackages(result.stdout), "Failed to list pinned packages");
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
  version?: string,
): Promise<WingetPackageDetails | null> {
  return withQuerySlot(async () => {
    const versionFlags = version ? ["--version", version] : [];
    const result = await runWinget(
      withSource(["show", ...EXACT_ID_FLAGS, id, ...versionFlags, ...BASE_FLAGS], source),
      {
        timeout: DETAILS_TIMEOUT_MS,
        signal,
      },
    );
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

/** One winget invocation: argv, plus whether winget itself runs elevated. */
interface Attempt {
  args: string[];
  elevated?: boolean;
}

/**
 * One failure class and its remedy. Rules are consulted in order after every
 * failed attempt; the first unspent match yields the next attempt, and each
 * rule fires at most once per operation. `disclose` annotates the eventual
 * success so overrides (e.g. --force) stay visible to the user.
 */
interface RecoveryRule {
  matches(result: WingetOperationResult): boolean;
  /** Wait before retrying (cancellable; a cancelled wait keeps the failure). */
  waitMs?: number;
  next(current: Attempt): Attempt;
  disclose?: string;
}

/**
 * The recovery engine: execute, and while the failure matches an unspent
 * rule, escalate to the rule's next attempt. Attempt state threads through
 * rules, so a later retry keeps what an earlier rule established — flags
 * (an elevated retry after --force keeps --force) and PRIVILEGE (a retry
 * after an elevated attempt stays elevated; the runner suspends cancellation
 * for the rest of the package once elevation starts, so a demoted attempt
 * would run uncancellable). Elevated attempts have no observable output —
 * their result comes from the exit code alone.
 */
async function executeWithRecovery(
  first: Attempt,
  rules: RecoveryRule[],
  options: WingetExecutorOptions,
): Promise<WingetOperationResult> {
  const run = (attempt: Attempt) =>
    attempt.elevated ? executeElevatedOperation(attempt.args, options) : executeOperation(attempt.args, options);

  const spent = new Set<RecoveryRule>();
  const disclosures: string[] = [];
  let attempt = first;
  let result = await run(attempt);
  for (;;) {
    if (result.success) {
      if (disclosures.length === 0 || result.noop) {
        return result;
      }
      const note = disclosures.join("; ");
      return {
        ...result,
        message: result.message ? `${result.message} (${note})` : note.charAt(0).toUpperCase() + note.slice(1),
      };
    }
    if (result.cancelled) {
      return result;
    }
    const rule = rules.find((r) => !spent.has(r) && r.matches(result));
    if (!rule) {
      return result;
    }
    spent.add(rule);
    if (rule.waitMs && (await delay(rule.waitMs, options.signal)) === "aborted") {
      return result;
    }
    if (rule.disclose) {
      disclosures.push(rule.disclose);
    }
    attempt = rule.next(attempt);
    result = await run(attempt);
  }
}

// The failure classes and their remedies. Adding a class = one classifier
// predicate + one rule here + the rule's slot in the operations' policies.

/**
 * ERROR_INSTALL_ALREADY_RUNNING (1618): the Windows Installer mutex was held
 * by another installation — a transient collision, not a package problem.
 * Wait it out and retry the same attempt.
 */
const installerBusyRule: RecoveryRule = {
  matches: isInstallerBusyFailure,
  waitMs: INSTALLER_BUSY_RETRY_DELAY_MS,
  next: (current) => current,
};

/**
 * Silent mode suppressed the installer's own UAC prompt (the root cause
 * behind upgrade's no---silent policy): retry without --silent.
 */
function unsilencedRetryRule(argsFor: (flags: string[]) => string[]): RecoveryRule {
  return {
    matches: isElevationFailure,
    next: (current) => ({ ...current, args: argsFor(ELEVATION_RETRY_FLAGS) }),
  };
}

/**
 * Nothing unelevated can install this package (machine-scope MSIX): relaunch
 * winget itself elevated — the UAC prompt is the confirmation, and a decline
 * is a normal per-package failure so bulk runs carry on. `args` overrides the
 * attempt (install/repair re-elevate their SILENT argv: the installer needs
 * no prompt of its own once winget is elevated); by default the current
 * attempt's argv is kept (upgrade's --force retry must survive elevation).
 */
function elevatedRetryRule(args?: () => string[]): RecoveryRule {
  return {
    matches: isElevationFailure,
    next: (current) => ({ args: args?.() ?? current.args, elevated: true }),
  };
}

/**
 * A modified portable package refuses removal during upgrade; winget's
 * printed remedy is --force (an upgrade replaces the package either way).
 * Uninstall deliberately has no such rule — forced removal deletes the
 * user's modifications, so it runs only after an explicit confirmation.
 */
function forceRetryRule(argsFor: (extra: string[]) => string[]): RecoveryRule {
  return {
    matches: isModifiedPortableFailure,
    next: (current) => ({ ...current, args: argsFor(["--force"]) }),
    disclose: "modified portable package, used --force",
  };
}

async function installPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const argsFor = (flags: string[]) => withSource(["install", ...EXACT_ID_FLAGS, id, ...flags], source);
  return executeWithRecovery(
    { args: argsFor(INSTALL_FLAGS) },
    [installerBusyRule, unsilencedRetryRule(argsFor), elevatedRetryRule(() => argsFor(INSTALL_FLAGS))],
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
  const argsFor = (flags: string[]) =>
    withSource(["install", ...EXACT_ID_FLAGS, id, "--version", version, ...flags], source);
  const result = await executeWithRecovery(
    { args: argsFor(INSTALL_FLAGS) },
    [installerBusyRule, unsilencedRetryRule(argsFor), elevatedRetryRule(() => argsFor(INSTALL_FLAGS))],
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

/** NO_APPLICATIONS_FOUND as a no-op — the meaning differs per operation. */
function remapNotFoundAsNoop(result: WingetOperationResult, message: string): WingetOperationResult {
  if (
    !result.success &&
    !result.cancelled &&
    result.exitCode !== undefined &&
    toUnsignedHResult(result.exitCode) === NO_APPLICATIONS_FOUND
  ) {
    return { ...result, success: true, noop: true, message, errorCode: undefined };
  }
  return result;
}

/**
 * Upgrade-specific: with a `--source` filter, winget reports an
 * installed-but-up-to-date package as NO_APPLICATIONS_FOUND ("No installed
 * package found matching input criteria") instead of UPDATE_NOT_APPLICABLE —
 * verified live (winget 1.28: 0x8A15002B without --source, 0x8A150014 with).
 */
function remapUpgradeNotFound(result: WingetOperationResult): WingetOperationResult {
  return remapNotFoundAsNoop(result, "No applicable update");
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
 * Failure classes caused by the environment or the user's own choice
 * (declines, busy installers, disk/memory/network, reboot pending), not by
 * the offered installer. A later attempt can succeed with the SAME version,
 * so these must never produce a failed-upgrade marker.
 */
const RETRYABLE_FAILURE_CODES: ReadonlySet<number> = new Set([
  CTRL_SIGNAL_RECEIVED,
  INSTALL_CANCELLED_BY_USER,
  COMMAND_REQUIRES_ADMIN,
  INSTALL_PACKAGE_IN_USE,
  INSTALL_INSTALL_IN_PROGRESS,
  INSTALL_FILE_IN_USE,
  INSTALL_PACKAGE_IN_USE_BY_APPLICATION,
  INSTALL_DISK_FULL,
  INSTALL_INSUFFICIENT_MEMORY,
  INSTALL_NO_NETWORK,
  DOWNLOAD_FAILED,
  INSTALL_REBOOT_REQUIRED_FOR_INSTALL,
]);

/** True when the same operation may succeed later without a version change. */
function isRetryableFailure(result: WingetOperationResult): boolean {
  if (result.cancelled || result.exitCode === UAC_DECLINED_EXIT_CODE) {
    return true;
  }
  if (result.exitCode !== undefined && RETRYABLE_FAILURE_CODES.has(toUnsignedHResult(result.exitCode))) {
    return true;
  }
  // Installer-level busy states surface as embedded codes or as the curated
  // app-in-use message (silent installers only disclose it in their logs).
  return isInstallerBusyFailure(result) || /^App in use/.test(result.message ?? "");
}

async function upgradePackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const argsFor = (extra: string[]) =>
    withSource(["upgrade", ...EXACT_ID_FLAGS, id, ...UPGRADE_FLAGS, ...extra], source);
  const result = await executeWithRecovery(
    { args: argsFor([]) },
    [installerBusyRule, forceRetryRule(argsFor), elevatedRetryRule()],
    options,
  );
  return remapUpgradeNotFound(result);
}

/**
 * Uninstall-specific exit-code remap: NO_APPLICATIONS_FOUND means winget has
 * no such installed package — the index row that offered the uninstall was a
 * ghost (the package was removed outside this extension, or a prior uninstall
 * finished without the index catching up). Not a failure: report a no-op so
 * the optimistic patch drops the row and the index self-heals.
 */
function remapUninstallNotFound(result: WingetOperationResult): WingetOperationResult {
  return remapNotFoundAsNoop(result, "Not installed");
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
  const result = await executeWithRecovery({ args }, [installerBusyRule, elevatedRetryRule()], options);
  return remapUninstallNotFound(result);
}

async function repairPackage(
  id: string,
  source: WingetSource,
  options: WingetExecutorOptions = {},
): Promise<WingetOperationResult> {
  const argsFor = (flags: string[]) => withSource(["repair", ...EXACT_ID_FLAGS, id, ...flags], source);
  return executeWithRecovery(
    { args: argsFor(REPAIR_FLAGS) },
    [installerBusyRule, unsilencedRetryRule(argsFor), elevatedRetryRule(() => argsFor(REPAIR_FLAGS))],
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
  ensureTableQuerySucceeded,
  isElevationFailure,
  isInstallerBusyFailure,
  isModifiedPortableFailure,
  isRetryableFailure,
  remapUninstallNotFound,
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
