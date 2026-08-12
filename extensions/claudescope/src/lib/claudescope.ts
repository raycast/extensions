import { getPreferenceValues } from "@raycast/api";
import { constants } from "node:fs";
import { access, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { delimiter, dirname, isAbsolute, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MINIMUM_CLAUDESCOPE_VERSION = "0.17.0";
const COMMAND_TIMEOUT_MS = 30_000;
const DISCOVERY_TIMEOUT_MS = 5_000;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024;
const MACOS_SYSTEM_PATHS = ["/usr/bin", "/bin", "/usr/sbin", "/sbin"];

interface ExtensionPreferences {
  executablePath?: string;
}

export interface SearchHit {
  sessionId: string;
  projectId: string;
  projectDisplayName: string;
  title: string;
  snippet: string;
  score: number;
  messageUuid: string;
  role: string;
}

export interface SearchResponse {
  sessions: SearchHit[];
}

export interface SessionMeta {
  id: string;
  projectId: string;
  projectDisplayName: string;
  title: string;
  startedAt: string;
  endedAt: string;
  messageCount: number;
  totalTokens: number;
  totalCostUsd: number;
  connectorId: string;
}

export type ClaudeScopeErrorKind = "missing" | "incompatible" | "indexing" | "invalid-output" | "command";

/** Actionable error exposed to the command views instead of raw subprocess details. */
export class ClaudeScopeError extends Error {
  constructor(
    readonly kind: ClaudeScopeErrorKind,
    message: string,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "ClaudeScopeError";
  }
}

interface PreferencePromise<T> {
  preference: string;
  promise: Promise<T>;
}

let executableCache: PreferencePromise<string> | undefined;
let compatibleExecutableCache: PreferencePromise<string> | undefined;
let projectDisplayNamesCache: PreferencePromise<ReadonlyMap<string, string>> | undefined;

function executablePreference(): string {
  return getPreferenceValues<ExtensionPreferences>().executablePath?.trim() ?? "";
}

function expandHome(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

async function validatedExecutable(path: string): Promise<string | undefined> {
  const expanded = expandHome(path.trim());
  if (!expanded || !isAbsolute(expanded)) return undefined;
  try {
    const info = await stat(expanded);
    if (!info.isFile()) return undefined;
    await access(expanded, constants.X_OK);
    return expanded;
  } catch {
    return undefined;
  }
}

function discoveryCandidates(): string[] {
  const home = homedir();
  const user = process.env.USER;
  return [
    "/opt/homebrew/bin/claudescope",
    "/usr/local/bin/claudescope",
    join(home, ".local", "bin", "claudescope"),
    join(home, ".npm-global", "bin", "claudescope"),
    join(home, ".nix-profile", "bin", "claudescope"),
    ...(user ? [`/etc/profiles/per-user/${user}/bin/claudescope`] : []),
    "/run/current-system/sw/bin/claudescope",
  ];
}

/** Ask the login shell for the executable using a constant command. User input
 * never enters the shell string; all ClaudeScope calls use argv execution. */
async function discoverFromLoginShell(): Promise<string | undefined> {
  const requestedShell = process.env.SHELL ?? "/bin/zsh";
  const shell = (await validatedExecutable(requestedShell)) ?? "/bin/zsh";
  try {
    const { stdout } = await execFileAsync(shell, ["-lic", "command -v claudescope"], {
      encoding: "utf8",
      timeout: DISCOVERY_TIMEOUT_MS,
      maxBuffer: 16 * 1024,
      env: process.env,
    });
    const lines = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .reverse();
    for (const line of lines) {
      const executable = await validatedExecutable(line);
      if (executable) return executable;
    }
  } catch {
    // Known installation paths below still cover non-interactive shell setups.
  }
  return undefined;
}

/** Resolve the binary once per command process. An explicit preference always
 * wins, including when it is invalid, so a typo is never silently ignored. */
export async function resolveClaudeScopeExecutable(): Promise<string> {
  const preference = executablePreference();
  if (!executableCache || executableCache.preference !== preference) {
    const pending = (async () => {
      if (preference) {
        const executable = await validatedExecutable(preference);
        if (executable) return executable;
        throw new ClaudeScopeError(
          "missing",
          "The configured ClaudeScope executable is not usable.",
          "Choose an existing executable file in ClaudeScope extension preferences.",
        );
      }

      const shellExecutable = await discoverFromLoginShell();
      if (shellExecutable) return shellExecutable;
      for (const candidate of discoveryCandidates()) {
        const executable = await validatedExecutable(candidate);
        if (executable) return executable;
      }

      throw new ClaudeScopeError(
        "missing",
        "ClaudeScope is not installed or could not be found.",
        "Install with npm (Node.js 22.12+), Homebrew, or Nix. See ClaudeScope Quick start.",
      );
    })();
    const cache = { preference, promise: pending };
    executableCache = cache;
    // Retry must observe a newly installed or corrected executable. Keep a
    // successful resolution cached only while its preference is unchanged.
    void pending.catch(() => {
      if (executableCache === cache) executableCache = undefined;
    });
  }
  return executableCache.promise;
}

interface ParsedVersion {
  core: [number, number, number];
  prerelease: string[];
}

function parseVersion(version: string): ParsedVersion | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version.trim());
  if (!match) return undefined;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]?.split(".") ?? [],
  };
}

function comparePrerelease(actual: string[], required: string[]): number {
  if (actual.length === 0 || required.length === 0) {
    return actual.length === required.length ? 0 : actual.length === 0 ? 1 : -1;
  }
  const length = Math.max(actual.length, required.length);
  for (let index = 0; index < length; index += 1) {
    const left = actual[index];
    const right = required[index];
    if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? -1 : 1;
    if (left === right) continue;
    const leftNumeric = /^\d+$/.test(left);
    const rightNumeric = /^\d+$/.test(right);
    if (leftNumeric && rightNumeric) return Number(left) > Number(right) ? 1 : -1;
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
    return left > right ? 1 : -1;
  }
  return 0;
}

function isAtLeast(version: string, minimum: string): boolean {
  const actual = parseVersion(version);
  const required = parseVersion(minimum);
  if (!actual || !required) return false;
  for (let index = 0; index < actual.core.length; index += 1) {
    if (actual.core[index] !== required.core[index]) return actual.core[index] > required.core[index];
  }
  return comparePrerelease(actual.prerelease, required.prerelease) >= 0;
}

function subprocessDetail(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const value = error as Error & { stderr?: string; stdout?: string };
  return (value.stderr || value.stdout || value.message).trim();
}

function normalizedCommandError(error: unknown): ClaudeScopeError {
  if (error instanceof ClaudeScopeError) return error;
  const detail = subprocessDetail(error);
  if (/503|index(?:er|ing| is not ready)/i.test(detail)) {
    return new ClaudeScopeError(
      "indexing",
      "ClaudeScope is still indexing transcript history.",
      "Wait a moment, then retry this command.",
    );
  }
  return new ClaudeScopeError(
    "command",
    "ClaudeScope could not complete the request.",
    detail || "Run claudescope status and inspect claudescope logs.",
  );
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error && (error.name === "AbortError" || (error as Error & { code?: string }).code === "ABORT_ERR")
  );
}

async function execute(executable: string, args: string[], signal?: AbortSignal): Promise<string> {
  try {
    // Raycast's PATH may omit both a version manager's Node binary and standard
    // macOS tools such as `/usr/bin/open`, which `claudescope open` launches.
    const path = [dirname(executable), ...MACOS_SYSTEM_PATHS, process.env.PATH].filter(Boolean).join(delimiter);
    const { stdout } = await execFileAsync(executable, args, {
      encoding: "utf8",
      timeout: COMMAND_TIMEOUT_MS,
      maxBuffer: MAX_OUTPUT_BYTES,
      signal,
      env: { ...process.env, PATH: path, NO_COLOR: "1" },
    });
    return stdout.trim();
  } catch (error) {
    if (isAbortError(error)) throw error;
    throw normalizedCommandError(error);
  }
}

async function compatibleExecutable(): Promise<string> {
  const preference = executablePreference();
  if (!compatibleExecutableCache || compatibleExecutableCache.preference !== preference) {
    const pending = (async () => {
      const executable = await resolveClaudeScopeExecutable();
      const version = await execute(executable, ["version"]);
      if (!isAtLeast(version, MINIMUM_CLAUDESCOPE_VERSION)) {
        throw new ClaudeScopeError(
          "incompatible",
          `ClaudeScope ${MINIMUM_CLAUDESCOPE_VERSION} or later is required.`,
          version ? `Installed version: ${version}. Run claudescope update.` : "Run claudescope update.",
        );
      }
      return executable;
    })();
    const cache = { preference, promise: pending };
    compatibleExecutableCache = cache;
    // A failed version check may become valid after `claudescope update`, so a
    // later Retry must run it again. The check itself is not cancellable.
    void pending.catch(() => {
      if (compatibleExecutableCache === cache) compatibleExecutableCache = undefined;
    });
  }
  return compatibleExecutableCache.promise;
}

/** Execute a ClaudeScope command directly with argv elements (never a shell). */
export async function runClaudeScope(args: string[], signal?: AbortSignal): Promise<string> {
  const executable = await compatibleExecutable();
  return execute(executable, args, signal);
}

function parseJson(output: string): unknown {
  try {
    return JSON.parse(output) as unknown;
  } catch {
    throw new ClaudeScopeError(
      "invalid-output",
      "ClaudeScope returned data this extension could not read.",
      "Update ClaudeScope and retry. If it continues, report the CLI output format as incompatible.",
    );
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

type SearchHitPayload = Omit<SearchHit, "projectDisplayName">;

function isSearchHit(value: unknown): value is SearchHitPayload {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.sessionId) &&
    typeof value.projectId === "string" &&
    typeof value.title === "string" &&
    typeof value.snippet === "string" &&
    typeof value.score === "number" &&
    isNonBlankString(value.messageUuid) &&
    typeof value.role === "string"
  );
}

function isProjectMeta(value: unknown): value is { id: string; displayName: string } {
  return isRecord(value) && isNonBlankString(value.id) && isNonBlankString(value.displayName);
}

/** Resolve stable project ids to the human names shown by ClaudeScope. */
async function projectDisplayNames(): Promise<ReadonlyMap<string, string>> {
  const preference = executablePreference();
  if (!projectDisplayNamesCache || projectDisplayNamesCache.preference !== preference) {
    const pending = (async () => {
      const output = await runClaudeScope(["projects", "--json"]);
      const parsed = parseJson(output);
      if (!Array.isArray(parsed) || !parsed.every(isProjectMeta)) {
        throw new ClaudeScopeError(
          "invalid-output",
          "ClaudeScope returned unexpected project metadata.",
          "Update ClaudeScope and retry.",
        );
      }
      return new Map(parsed.map((project) => [project.id, project.displayName]));
    })();
    const cache = { preference, promise: pending };
    projectDisplayNamesCache = cache;
    void pending.catch(() => {
      if (projectDisplayNamesCache === cache) projectDisplayNamesCache = undefined;
    });
  }
  return projectDisplayNamesCache.promise;
}

function isSessionMeta(value: unknown): value is SessionMeta {
  if (!isRecord(value)) return false;
  return (
    isNonBlankString(value.id) &&
    typeof value.projectId === "string" &&
    typeof value.projectDisplayName === "string" &&
    typeof value.title === "string" &&
    typeof value.startedAt === "string" &&
    typeof value.endedAt === "string" &&
    typeof value.messageCount === "number" &&
    typeof value.totalTokens === "number" &&
    typeof value.totalCostUsd === "number" &&
    typeof value.connectorId === "string"
  );
}

export async function searchTranscripts(query: string, signal?: AbortSignal): Promise<SearchHit[]> {
  const output = await runClaudeScope(
    ["search", query.slice(0, 300), "--scope", "sessions", "--limit", "30", "--json"],
    signal,
  );
  const parsed = parseJson(output);
  if (!isRecord(parsed) || !Array.isArray(parsed.sessions) || !parsed.sessions.every(isSearchHit)) {
    throw new ClaudeScopeError(
      "invalid-output",
      "ClaudeScope returned an unexpected search response.",
      "Update ClaudeScope and retry.",
    );
  }
  const projectNames = await projectDisplayNames().catch(() => new Map<string, string>());
  return parsed.sessions.slice(0, 30).map((hit) => ({
    ...hit,
    projectDisplayName: projectNames.get(hit.projectId) ?? hit.projectId,
  }));
}

export async function listRecentSessions(signal?: AbortSignal): Promise<SessionMeta[]> {
  const output = await runClaudeScope(["sessions", "--sort", "recent", "--limit", "75", "--json"], signal);
  const parsed = parseJson(output);
  if (!Array.isArray(parsed) || !parsed.every(isSessionMeta)) {
    throw new ClaudeScopeError(
      "invalid-output",
      "ClaudeScope returned an unexpected sessions response.",
      "Update ClaudeScope and retry.",
    );
  }
  return parsed.slice(0, 75);
}

export function openClaudeScope(sessionId?: string, messageUuid?: string): Promise<string> {
  if (sessionId !== undefined && !isNonBlankString(sessionId)) {
    throw new ClaudeScopeError("invalid-output", "ClaudeScope returned an empty session ID.");
  }
  if (messageUuid !== undefined && !isNonBlankString(messageUuid)) {
    throw new ClaudeScopeError("invalid-output", "ClaudeScope returned an empty message ID.");
  }
  if (messageUuid !== undefined && sessionId === undefined) {
    throw new ClaudeScopeError("invalid-output", "ClaudeScope returned a message without a session ID.");
  }
  const args = ["open"];
  if (sessionId) args.push("--session", sessionId);
  if (messageUuid) args.push("--around", messageUuid);
  return runClaudeScope(args);
}
