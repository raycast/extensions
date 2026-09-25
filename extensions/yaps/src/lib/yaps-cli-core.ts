import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, open, realpath, rm, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, delimiter, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  VaultListResult,
  VaultNote,
  VaultNoteMutationResult,
  VaultNoteResult,
  VaultSearchResult,
  VaultStatus,
} from "./types";

const MAX_CLI_OUTPUT_BYTES = 12 * 1024 * 1024;
const DEFAULT_CLI_TIMEOUT_MS = 20_000;
const MAX_RESULT_LIMIT = 100;
const MAX_CLI_ARGUMENT_BYTES = 64 * 1024;
const MAX_CLI_ERROR_LENGTH = 2_000;
const CLI_DISCOVERY_TIMEOUT_MS = 5_000;
const CLI_DISCOVERY_TOTAL_TIMEOUT_MS = 15_000;
const MAX_PATH_CLI_CANDIDATES = 64;
const MAX_ADDITIONAL_CLI_CANDIDATES = 8;
const MAX_CLI_DISCOVERY_CANDIDATES = 80;
const MAX_CLI_DISCOVERY_PROBES = 8;
const MAX_DISCOVERY_OUTPUT_BYTES = 64 * 1024;
const MAX_METADATA_BYTES = 64 * 1024;
const MIN_SAFE_AUTH_STATUS_VERSION = [2, 3, 124] as const;
const AUTH_RECOVERY_TIMEOUT_MS = 6_000;
const AUTH_RETRY_DELAYS_MS = [250, 500, 1_000, 2_000] as const;
const REFRESHABLE_AUTH_STATES = new Set([
  "cached_offline",
  "credential_missing",
  "verification_unavailable",
]);
const REFRESHABLE_AUTH_DIAGNOSTICS = new Set([
  "account_cache_incomplete",
  "credential_missing",
  "profile_lookup_failed",
  "refresh_failed",
]);

export interface YapsCliOptions {
  configuredPath?: string;
  additionalCliPaths?: () => Promise<string[]>;
  authRecoveryTimeoutMs?: number;
  authRetryDelaysMs?: readonly number[];
  launchYapsApp?: (applicationPath: string) => Promise<boolean>;
  recoveryApplicationPath?: (cliPath: string) => Promise<string | undefined>;
  supportPath: string;
  maxDiscoveryCandidates?: number;
  discoveryTimeoutMs?: number;
  maxDiscoveryProbes?: number;
  timeoutMs?: number;
}

export class YapsCliNotFoundError extends Error {
  constructor() {
    super(
      "Yaps CLI was not found. Install Yaps, or set the CLI path in this extension's preferences.",
    );
    this.name = "YapsCliNotFoundError";
  }
}

export class YapsNoteNotFoundError extends Error {
  constructor(path: string) {
    super(`Yaps could not find the note "${path}". It may have been moved or deleted.`);
    this.name = "YapsNoteNotFoundError";
  }
}

export class YapsCliResponseError extends Error {
  constructor() {
    super("Yaps CLI returned an unsupported response. Update Yaps and try again.");
    this.name = "YapsCliResponseError";
  }
}

export class YapsCli {
  private cachedCliPath: string | undefined;
  private sessionPromise: Promise<AccountSession> | undefined;

  constructor(private readonly options: YapsCliOptions) {}

  async resolveCliPath(): Promise<string> {
    if (this.cachedCliPath && (await isExecutable(this.cachedCliPath))) {
      return this.cachedCliPath;
    }
    this.cachedCliPath = undefined;

    const discoveryTimeoutMs = positiveInteger(
      this.options.discoveryTimeoutMs,
      CLI_DISCOVERY_TOTAL_TIMEOUT_MS,
    );
    const deadline = Date.now() + discoveryTimeoutMs;
    const configured = this.options.configuredPath?.trim();
    if (configured) {
      const override = expandHome(configured);
      if (
        await isValidatedYapsCli(
          override,
          Math.min(CLI_DISCOVERY_TIMEOUT_MS, Math.max(1, deadline - Date.now())),
        )
      ) {
        this.cachedCliPath = override;
        return override;
      }
      throw new YapsCliNotFoundError();
    }

    const additionalCandidates = await this.additionalCliCandidates(deadline);
    const candidates = [
      ...new Set(
        [
          ...pathCliCandidates().slice(0, MAX_PATH_CLI_CANDIDATES),
          ...additionalCandidates,
          "/Applications/Yaps.app/Contents/MacOS/yaps_cli",
          join(homedir(), "Applications", "Yaps.app", "Contents", "MacOS", "yaps_cli"),
        ].filter((candidate): candidate is string => Boolean(candidate)),
      ),
    ];

    const maxCandidates = nonNegativeInteger(
      this.options.maxDiscoveryCandidates,
      MAX_CLI_DISCOVERY_CANDIDATES,
    );
    const maxProbes = nonNegativeInteger(this.options.maxDiscoveryProbes, MAX_CLI_DISCOVERY_PROBES);
    let candidatesChecked = 0;
    let probes = 0;
    for (const candidate of candidates) {
      if (Date.now() >= deadline || candidatesChecked >= maxCandidates || probes >= maxProbes)
        break;
      candidatesChecked += 1;
      if (!(await isExecutable(candidate))) continue;
      probes += 1;
      if (
        await isValidatedYapsCli(
          candidate,
          Math.min(CLI_DISCOVERY_TIMEOUT_MS, Math.max(1, deadline - Date.now())),
        )
      ) {
        this.cachedCliPath = candidate;
        return candidate;
      }
    }

    throw new YapsCliNotFoundError();
  }

  private async additionalCliCandidates(deadline: number): Promise<string[]> {
    const additionalCliPaths = this.options.additionalCliPaths;
    if (!additionalCliPaths) return [];
    try {
      const candidates = await settleBeforeDeadline(additionalCliPaths(), deadline);
      if (!Array.isArray(candidates)) return [];
      return candidates
        .filter(
          (candidate): candidate is string => typeof candidate === "string" && candidate.length > 0,
        )
        .slice(0, MAX_ADDITIONAL_CLI_CANDIDATES);
    } catch {
      return [];
    }
  }

  async listNotes(limit = 40, signal?: AbortSignal): Promise<VaultNote[]> {
    const normalizedLimit = normalizeLimit(limit);
    const result = expectResponse(
      await this.run(["vault", "list", "--limit", String(normalizedLimit)], signal),
      isVaultListResult,
    );
    return [...result.notes].sort(
      (left, right) =>
        right.updated_at - left.updated_at ||
        compareStrings(left.path, right.path) ||
        compareStrings(left.id, right.id),
    );
  }

  async searchNotes(query: string, limit = 30, signal?: AbortSignal): Promise<VaultSearchResult> {
    const normalizedQuery = validateCliArgument(query, "Search query");
    const normalizedLimit = normalizeLimit(limit);
    return expectResponse(
      await this.run(
        ["vault", "search", normalizedQuery, "--limit", String(normalizedLimit)],
        signal,
      ),
      isVaultSearchResult,
    );
  }

  async getNote(path: string): Promise<VaultNote> {
    const normalizedPath = validateCliArgument(path, "Note path");
    const result = expectResponse(
      await this.run(["vault", "get", normalizedPath]),
      isVaultNoteResult,
    );
    if (!result.note) {
      throw new YapsNoteNotFoundError(path);
    }
    return result.note;
  }

  async getVaultStatus(): Promise<VaultStatus> {
    return expectResponse(await this.run(["vault", "status"]), isVaultStatus);
  }

  async resolveVaultFile(notePath: string): Promise<string> {
    const normalizedNotePath = validateCliArgument(notePath, "Note path");
    const status = await this.getVaultStatus();
    const configuredRoot = resolve(status.root.trim());
    const configuredFile = resolve(configuredRoot, normalizedNotePath);
    if (!isPathInside(configuredRoot, configuredFile)) {
      throw new Error("Yaps returned a note path outside the active vault.");
    }

    const root = await realpath(configuredRoot);
    let file: string;
    try {
      file = await realpath(configuredFile);
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        throw new YapsNoteNotFoundError(normalizedNotePath);
      }
      throw error;
    }
    if (!isPathInside(root, file)) {
      throw new Error("Yaps returned a note path outside the active vault.");
    }
    if (!(await stat(file)).isFile()) {
      throw new Error("Yaps returned a note path that is not a regular file.");
    }
    return file;
  }

  async createClipboardNote(title: string, markdown: string, folder: string): Promise<VaultNote> {
    const normalizedTitle = validateCliArgument(title, "Note title");
    const normalizedFolderValue = validateCliArgument(folder, "Vault folder");
    const temporaryDir = join(this.options.supportPath, "clipboard-captures");
    const temporaryPath = join(temporaryDir, `${randomUUID()}.md`);
    await mkdir(temporaryDir, { recursive: true, mode: 0o700 });

    try {
      await writeFile(temporaryPath, markdown, { encoding: "utf8", mode: 0o600 });
      const result = expectResponse(
        await this.run([
          "vault",
          "create",
          "--folder",
          normalizedFolder(normalizedFolderValue),
          "--title",
          normalizedTitle,
          "--markdown-file",
          temporaryPath,
          "--source",
          "quick_capture",
        ]),
        isVaultNoteMutationResult,
      );
      return result.note;
    } finally {
      await rm(temporaryPath, { force: true });
      await removeEmptyDirectory(temporaryDir);
    }
  }

  private async run(args: string[], signal?: AbortSignal): Promise<unknown> {
    const cliPath = await this.resolveCliPath();
    const session = await this.resolveAccountSession(cliPath);
    try {
      const { stdout } = await execFileBounded(
        cliPath,
        [
          ...(session.settingsPath ? ["--settings-path", session.settingsPath] : []),
          ...args,
          "--pretty",
        ],
        {
          maxBuffer: MAX_CLI_OUTPUT_BYTES,
          timeout: this.options.timeoutMs ?? DEFAULT_CLI_TIMEOUT_MS,
          windowsHide: true,
          signal,
        },
      );
      return JSON.parse(stdout) as unknown;
    } catch (error) {
      if (errorCode(error) === "ENOENT") {
        this.cachedCliPath = undefined;
      }
      throw cliError(error);
    }
  }

  private async resolveAccountSession(cliPath: string): Promise<AccountSession> {
    this.sessionPromise ??= this.recoverAccountSession(cliPath).finally(() => {
      this.sessionPromise = undefined;
    });
    return this.sessionPromise;
  }

  private async recoverAccountSession(cliPath: string): Promise<AccountSession> {
    const safety = await credentialFreeAuthStatusSafety(cliPath);
    if (safety.kind === "unsafe") {
      throw new Error(
        `Yaps ${safety.version ?? "before 2.3.124"} uses an older credential-based account check, so Raycast did not run it. Update Yaps to 2.3.124 or newer; Raycast will then reuse the desktop sign-in, trial, or Yaps Pro automatically.`,
      );
    }
    if (safety.kind !== "safe") {
      throw new Error(
        "Raycast found a working Yaps CLI but could not verify that its account check is credential-free, so it did not run it. Update or reinstall the official Yaps app; Raycast will then reuse its desktop account automatically.",
      );
    }

    const explicitSettings = Boolean(process.env.YAPS_SETTINGS_PATH?.trim());
    let settingsPath: string | undefined;
    let auth = await readAuthStatus(cliPath);
    if (
      !explicitSettings &&
      auth?.status === "settings_path_mismatch" &&
      auth.recommendedSettingsPath
    ) {
      const retry = await readAuthStatus(cliPath, auth.recommendedSettingsPath);
      if (retry) {
        settingsPath = auth.recommendedSettingsPath;
        auth = retry;
      }
    }

    if (refreshableAuth(auth)) {
      const recoveryTimeoutMs = positiveInteger(
        this.options.authRecoveryTimeoutMs,
        AUTH_RECOVERY_TIMEOUT_MS,
      );
      const deadline = Date.now() + recoveryTimeoutMs;
      const resolveApplication =
        this.options.recoveryApplicationPath ?? recoveryApplicationPathForCli;
      const applicationPath = await settleBeforeDeadline(resolveApplication(cliPath), deadline);
      if (applicationPath) {
        const launch = this.options.launchYapsApp ?? launchInstalledYaps;
        const launched = await settleBeforeDeadline(launch(applicationPath), deadline);
        if (launched) {
          for (const delayMs of this.options.authRetryDelaysMs ?? AUTH_RETRY_DELAYS_MS) {
            const remainingBeforeDelay = deadline - Date.now();
            if (remainingBeforeDelay <= 0) break;
            await delay(Math.min(Math.max(0, delayMs), remainingBeforeDelay));
            const remaining = deadline - Date.now();
            if (remaining <= 0) break;
            const retry = await readAuthStatus(cliPath, settingsPath, remaining);
            if (!retry) continue;
            auth = retry;
            if (!refreshableAuth(auth)) break;
          }
        }
      }
    }

    requireActiveAccount(auth);
    return { auth, settingsPath };
  }
}

interface AccountSession {
  auth: AuthStatus;
  settingsPath?: string;
}

function parsedVersion(value: string | undefined): number[] | undefined {
  const match = value?.trim().match(/^v?(\d+)\.(\d+)\.(\d+)(?:\D|$)/);
  if (!match) return undefined;
  const parts = match.slice(1).map(Number);
  return parts.every(Number.isSafeInteger) ? parts : undefined;
}

function versionAtLeast(value: string | undefined): boolean {
  const parts = parsedVersion(value);
  if (!parts) return false;
  for (let index = 0; index < MIN_SAFE_AUTH_STATUS_VERSION.length; index += 1) {
    const installed = parts[index] ?? -1;
    const minimum = MIN_SAFE_AUTH_STATUS_VERSION[index] ?? Number.MAX_SAFE_INTEGER;
    if (installed > minimum) return true;
    if (installed < minimum) return false;
  }
  return true;
}

type AuthStatusSafety =
  | { kind: "safe"; version: string }
  | { kind: "unsafe"; version: string }
  | { kind: "unknown"; version?: undefined };

function authStatusSafetyForVersion(value: string | undefined): AuthStatusSafety {
  const version = value?.trim();
  if (!version || !parsedVersion(version)) return { kind: "unknown" };
  return versionAtLeast(version) ? { kind: "safe", version } : { kind: "unsafe", version };
}

async function readBoundedText(command: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileBounded(command, args, {
      maxBuffer: 4 * 1024,
      timeout: CLI_DISCOVERY_TIMEOUT_MS,
      windowsHide: true,
    });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

function xmlPlistString(contents: string, key: string): string | undefined {
  const match = contents.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]+)</string>`));
  return match?.[1]?.trim() || undefined;
}

async function readBoundedFile(path: string, maximumBytes: number): Promise<string | undefined> {
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(path, "r");
    const buffer = Buffer.alloc(maximumBytes + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return bytesRead <= maximumBytes ? buffer.subarray(0, bytesRead).toString("utf8") : undefined;
  } catch {
    return undefined;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

async function credentialFreeAuthStatusSafety(cliPath: string): Promise<AuthStatusSafety> {
  let canonical = cliPath;
  try {
    canonical = await realpath(cliPath);
  } catch {
    // A validated path may be unavailable between discovery and this check.
  }
  const suffix = `${sep}Contents${sep}MacOS${sep}yaps_cli`;
  if (!canonical.endsWith(suffix)) return { kind: "unknown" };
  const application = canonical.slice(0, -suffix.length);
  if (basename(application) !== "Yaps.app") return { kind: "unknown" };
  const plist = join(application, "Contents", "Info.plist");
  const contents = await readBoundedFile(plist, MAX_METADATA_BYTES);
  if (contents?.includes("<plist")) {
    if (xmlPlistString(contents, "CFBundleIdentifier") !== "com.yaps.app") {
      return { kind: "unknown" };
    }
    return authStatusSafetyForVersion(xmlPlistString(contents, "CFBundleShortVersionString"));
  }
  // Binary plists are read by the fixed, bounded system utility below.
  const [bundleIdentifier, version] = await Promise.all([
    readBoundedText("/usr/bin/plutil", ["-extract", "CFBundleIdentifier", "raw", "-o", "-", plist]),
    readBoundedText("/usr/bin/plutil", [
      "-extract",
      "CFBundleShortVersionString",
      "raw",
      "-o",
      "-",
      plist,
    ]),
  ]);
  return bundleIdentifier === "com.yaps.app"
    ? authStatusSafetyForVersion(version)
    : { kind: "unknown" };
}

function documentedYapsApplicationPaths(): string[] {
  return ["/Applications/Yaps.app", join(homedir(), "Applications", "Yaps.app")];
}

async function recoveryApplicationPathForCli(cliPath: string): Promise<string | undefined> {
  if (process.platform !== "darwin") return undefined;
  let canonicalCli: string;
  try {
    canonicalCli = await realpath(cliPath);
  } catch {
    return undefined;
  }
  return documentedYapsApplicationPaths().find(
    (applicationPath) => canonicalCli === join(applicationPath, "Contents", "MacOS", "yaps_cli"),
  );
}

async function launchInstalledYaps(applicationPath: string): Promise<boolean> {
  if (
    process.platform !== "darwin" ||
    !documentedYapsApplicationPaths().includes(applicationPath)
  ) {
    return false;
  }
  try {
    if (!(await stat(applicationPath)).isDirectory()) return false;
    await execFileBounded("/usr/bin/open", ["-g", applicationPath], {
      maxBuffer: 4 * 1024,
      timeout: 3_000,
      windowsHide: true,
    });
    return true;
  } catch {
    return false;
  }
}

function expectResponse<T>(value: unknown, predicate: (value: unknown) => value is T): T {
  if (!predicate(value)) {
    throw new YapsCliResponseError();
  }
  return value;
}

function isVaultListResult(value: unknown): value is VaultListResult {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.count) &&
    Array.isArray(value.notes) &&
    value.notes.length <= MAX_RESULT_LIMIT &&
    value.notes.every(isVaultNote)
  );
}

function isVaultNoteResult(value: unknown): value is VaultNoteResult {
  return isRecord(value) && (value.note === null || isVaultNote(value.note));
}

function isVaultNoteMutationResult(value: unknown): value is VaultNoteMutationResult {
  return (
    isRecord(value) &&
    Array.isArray(value.changed_fields) &&
    value.changed_fields.every((field) => typeof field === "string") &&
    isVaultNote(value.note)
  );
}

function isVaultSearchResult(value: unknown): value is VaultSearchResult {
  return (
    isRecord(value) &&
    isNonNegativeInteger(value.count) &&
    Array.isArray(value.hits) &&
    value.hits.length <= MAX_RESULT_LIMIT &&
    value.hits.every(
      (hit) =>
        isRecord(hit) &&
        isNonEmptyString(hit.note_id) &&
        isNonEmptyString(hit.path) &&
        typeof hit.score === "number" &&
        Number.isFinite(hit.score) &&
        typeof hit.snippet === "string" &&
        isNonEmptyString(hit.title),
    )
  );
}

function isVaultStatus(value: unknown): value is VaultStatus {
  return (
    isRecord(value) &&
    typeof value.index_initialized === "boolean" &&
    isNonNegativeInteger(value.note_count) &&
    typeof value.root === "string" &&
    isAbsolute(value.root.trim())
  );
}

function isVaultNote(value: unknown): value is VaultNote {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.path) &&
    isNonEmptyString(value.title) &&
    typeof value.markdown === "string" &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === "string") &&
    Array.isArray(value.aliases) &&
    value.aliases.every((alias) => typeof alias === "string") &&
    isNonEmptyString(value.source) &&
    isNonEmptyString(value.kind) &&
    typeof value.pinned === "boolean" &&
    isFiniteNumber(value.created_at) &&
    isFiniteNumber(value.updated_at)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPathInside(root: string, candidate: string): boolean {
  const relativePath = relative(root, candidate);
  return (
    relativePath !== "" &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`) &&
    !isAbsolute(relativePath)
  );
}

function pathCliCandidates(): string[] {
  const candidates = (process.env.PATH ?? "")
    .split(delimiter)
    .filter(Boolean)
    .flatMap((pathEntry) => [join(pathEntry, "yaps"), join(pathEntry, "yaps_cli")]);
  return [...new Set(candidates)];
}

async function isExecutable(path: string): Promise<boolean> {
  try {
    if (!(await stat(path)).isFile()) {
      return false;
    }
    await access(path, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

async function isValidatedYapsCli(
  path: string,
  timeoutMs = CLI_DISCOVERY_TIMEOUT_MS,
): Promise<boolean> {
  if (!(await isExecutable(path))) return false;
  if (await isPackagedYapsGuiExecutable(path)) return false;
  try {
    const { stdout } = await execFileBounded(path, ["status", "--pretty"], {
      maxBuffer: MAX_DISCOVERY_OUTPUT_BYTES,
      timeout: timeoutMs,
      windowsHide: true,
    });
    const value = JSON.parse(stdout) as Record<string, unknown>;
    return (
      typeof value.settings_path === "string" &&
      typeof value.settings_exists === "boolean" &&
      typeof value.auth_store_path === "string" &&
      typeof value.models_dir === "string"
    );
  } catch {
    return false;
  }
}

async function isPackagedYapsGuiExecutable(path: string): Promise<boolean> {
  try {
    const canonical = await realpath(path);
    return canonical.endsWith(`${sep}Yaps.app${sep}Contents${sep}MacOS${sep}yaps`);
  } catch {
    return false;
  }
}

interface AuthStatus {
  authenticated: boolean;
  diagnosticCode?: string;
  recommendedSettingsPath?: string;
  status: string;
}

async function readAuthStatus(
  path: string,
  settingsPath?: string,
  timeoutMs = CLI_DISCOVERY_TIMEOUT_MS,
): Promise<AuthStatus | undefined> {
  try {
    const { stdout } = await execFileBounded(
      path,
      [...(settingsPath ? ["--settings-path", settingsPath] : []), "--pretty", "auth", "status"],
      {
        maxBuffer: MAX_DISCOVERY_OUTPUT_BYTES,
        timeout: Math.min(CLI_DISCOVERY_TIMEOUT_MS, Math.max(1, timeoutMs)),
        windowsHide: true,
      },
    );
    const value = JSON.parse(stdout) as Record<string, unknown>;
    if (typeof value.authenticated !== "boolean" || typeof value.status !== "string") {
      return undefined;
    }
    return {
      authenticated: value.authenticated,
      diagnosticCode: typeof value.diagnostic_code === "string" ? value.diagnostic_code : undefined,
      status: value.status,
      recommendedSettingsPath: validRecommendedSettingsPath(value.recommended_settings_path),
    };
  } catch {
    return undefined;
  }
}

function refreshableAuth(auth: AuthStatus | undefined): boolean {
  if (
    !auth ||
    [
      "active",
      "expired",
      "mobile_only",
      "platform_mismatch",
      "signed_out",
      "unauthenticated",
    ].includes(auth.status)
  ) {
    return false;
  }
  return (
    REFRESHABLE_AUTH_STATES.has(auth.status) ||
    REFRESHABLE_AUTH_DIAGNOSTICS.has(auth.diagnosticCode ?? "")
  );
}

function requireActiveAccount(auth: AuthStatus | undefined): asserts auth is AuthStatus {
  if (auth?.authenticated && auth.status === "active") return;

  if (auth?.status === "expired") {
    throw new Error(
      "Yaps is signed in, but its trial or Yaps Pro access is not active. Open Yaps to review the available trial or Yaps Pro options; Raycast will pick up the change automatically.",
    );
  }
  if (auth?.status === "platform_mismatch" || auth?.status === "mobile_only") {
    throw new Error(
      "Yaps is signed in, but this account only has mobile access. Activate desktop-compatible access in Yaps; Raycast will use it automatically.",
    );
  }
  if (auth?.status === "signed_out" || auth?.status === "unauthenticated") {
    throw new Error(
      "Yaps is installed, but no active desktop account is signed in. Sign in inside Yaps and start an available trial or activate Yaps Pro; Raycast then uses that same session automatically.",
    );
  }
  if (auth?.status === "settings_path_mismatch") {
    throw new Error(
      "Yaps is signed in under a different settings file, and Raycast could not follow it automatically. Update Yaps and retry; no separate Raycast connection is required.",
    );
  }
  if (
    auth?.status === "cached_offline" ||
    auth?.status === "credential_missing" ||
    auth?.status === "verification_unavailable"
  ) {
    throw new Error(
      "Yaps found the desktop sign-in but could not verify current trial or Yaps Pro access. Check the internet connection, open Yaps once, and retry; no separate Raycast connection is required.",
    );
  }
  throw new Error(
    "Raycast could not read a supported Yaps account state. Update Yaps, open it once, and retry; Raycast uses the desktop sign-in automatically.",
  );
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function validRecommendedSettingsPath(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const candidate = value.trim();
  return candidate.length <= 4_096 &&
    !candidate.includes("\0") &&
    isAbsolute(candidate) &&
    basename(candidate).toLowerCase() === "settings.json"
    ? candidate
    : undefined;
}

function expandHome(path: string): string {
  if (path === "~") {
    return homedir();
  }
  return path.startsWith(`~${sep}`) ? join(homedir(), path.slice(2)) : path;
}

function cliError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error("Yaps CLI failed unexpectedly.");
  }

  const code = errorCode(error);
  if (code === "ETIMEDOUT" || ("killed" in error && error.killed === true)) {
    return new Error("Yaps took too long to respond. Try again, or restart Yaps.");
  }
  if (code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER") {
    return new Error("Yaps returned too much data. Narrow the search and try again.");
  }
  if (code === "ENOENT") {
    return new YapsCliNotFoundError();
  }
  const stderr = "stderr" in error && typeof error.stderr === "string" ? error.stderr.trim() : "";
  if (stderr) {
    return new Error(limitErrorMessage(stderr));
  }
  if (error.name === "SyntaxError") {
    return new Error("Yaps CLI returned an unreadable response. Update Yaps and try again.");
  }
  return error;
}

function errorCode(error: unknown): string | undefined {
  return isRecord(error) && typeof error.code === "string" ? error.code : undefined;
}

interface BoundedExecOptions {
  env?: NodeJS.ProcessEnv;
  maxBuffer: number;
  signal?: AbortSignal;
  timeout: number;
  windowsHide?: boolean;
}

function execFileBounded(
  command: string,
  args: string[],
  options: BoundedExecOptions,
): Promise<{ stderr: string; stdout: string }> {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error | null, result?: { stderr: string; stdout: string }) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (error) rejectPromise(error);
      else if (result) resolvePromise(result);
    };
    const child = execFile(
      command,
      args,
      {
        encoding: "utf8",
        env: options.env,
        killSignal: "SIGKILL",
        maxBuffer: options.maxBuffer,
        signal: options.signal,
        windowsHide: options.windowsHide,
      },
      (error, stdout, stderr) => finish(error, { stderr, stdout }),
    );
    if (!settled) {
      timer = setTimeout(
        () => {
          child.stdout?.destroy();
          child.stderr?.destroy();
          child.kill("SIGKILL");
          finish(
            Object.assign(new Error("Yaps CLI timed out."), {
              code: "ETIMEDOUT",
              killed: true,
            }),
          );
        },
        Math.max(1, options.timeout),
      );
    }
  });
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value ?? 0) > 0 ? (value as number) : fallback;
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isSafeInteger(value) && (value ?? -1) >= 0 ? (value as number) : fallback;
}

async function settleBeforeDeadline<T>(
  operation: Promise<T>,
  deadline: number,
): Promise<T | undefined> {
  const remaining = deadline - Date.now();
  if (remaining <= 0) return undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<undefined>((resolvePromise) => {
        timer = setTimeout(() => resolvePromise(undefined), remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function normalizeLimit(limit: number): number {
  if (!Number.isSafeInteger(limit) || limit < 0) {
    throw new Error("Yaps requested an invalid result limit.");
  }
  return Math.min(limit, MAX_RESULT_LIMIT);
}

function validateCliArgument(value: string, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be text.`);
  }
  if (value.includes("\0")) {
    throw new Error(`${label} contains an unsupported null character.`);
  }
  if (Buffer.byteLength(value, "utf8") > MAX_CLI_ARGUMENT_BYTES) {
    throw new Error(`${label} is too long. Shorten it and try again.`);
  }
  return value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function limitErrorMessage(message: string): string {
  return message.length <= MAX_CLI_ERROR_LENGTH
    ? message
    : `${message.slice(0, MAX_CLI_ERROR_LENGTH - 1)}…`;
}

function normalizedFolder(folder: string): string {
  const normalized = folder
    .split(/[\\/]/)
    .map((part) => part.trim())
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return normalized || "Inbox";
}

async function removeEmptyDirectory(path: string): Promise<void> {
  try {
    await rm(path, { recursive: false });
  } catch {
    // Another capture can still be using the shared temporary directory.
  }
}

export function fileLabel(path: string): string {
  const parent = basename(dirname(path));
  return parent && parent !== "." ? `${parent}/${basename(path)}` : basename(path);
}
