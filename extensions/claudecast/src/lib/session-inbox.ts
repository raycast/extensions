import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFilePromise = promisify(execFile);
const MAX_METADATA_FILES = 10_000;
const MAX_METADATA_FILE_BYTES = 64 * 1024 * 1024;
const METADATA_WINDOW_BYTES = 8 * 1024;
const MAX_CONDUCTOR_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_STRING_LENGTH = 1_000;

export type SessionBackend =
  | "claude-cli"
  | "claude-desktop"
  | "vscode"
  | "conductor"
  | "wsl";

export interface SessionSourceDescriptor {
  backend: SessionBackend;
  nativePath?: string;
  externalId?: string;
  workspaceId?: string;
  linuxPath?: string;
  state?: "active" | "archived";
}

export interface DesktopSessionRecord {
  cliSessionId: string;
  localSessionId: string;
  title?: string;
  cwd?: string;
  bridgeId?: string;
  isArchived?: boolean;
  scheduledTaskId?: string;
  metadataPath: string;
}

export interface ConductorSessionRecord {
  cliSessionId: string;
  title?: string;
  workspaceId?: string;
  workspacePath?: string;
  state?: "active" | "archived";
}

export interface SupplementalSessionMetadata {
  desktopBySessionId: Map<string, DesktopSessionRecord[]>;
  conductorBySessionId: Map<string, ConductorSessionRecord[]>;
  conductorByWorkspacePath: Map<string, ConductorSessionRecord[]>;
}

export interface SessionInboxMetadata {
  sources: SessionSourceDescriptor[];
  title?: string;
  archived: boolean;
  desktopLocalSessionId?: string;
  desktopBridgeId?: string;
  conductorWorkspaceId?: string;
  workspacePath?: string;
}

export interface SessionInboxLocations {
  desktopRoot?: string;
  conductorDatabase?: string;
}

export interface LoadSessionInboxOptions extends SessionInboxLocations {
  platform?: NodeJS.Platform;
  signal?: AbortSignal;
  maxMetadataFiles?: number;
  queryConductor?: (
    databasePath: string,
    signal?: AbortSignal,
  ) => Promise<unknown>;
}

interface ConductorPrivateRow {
  claude_session_id?: unknown;
  title?: unknown;
  workspace_id?: unknown;
  workspace_path?: unknown;
  workspace_state?: unknown;
}

export function getDefaultSessionInboxLocations(
  homeDirectory = os.homedir(),
  platform: NodeJS.Platform = process.platform,
  env: NodeJS.ProcessEnv = process.env,
): SessionInboxLocations {
  if (platform === "darwin") {
    const applicationSupport = path.join(
      homeDirectory,
      "Library",
      "Application Support",
    );
    return {
      desktopRoot: path.join(
        applicationSupport,
        "Claude",
        "claude-code-sessions",
      ),
      conductorDatabase: path.join(
        applicationSupport,
        "com.conductor.app",
        "conductor.db",
      ),
    };
  }
  if (platform === "win32") {
    const appData =
      getEnvironmentValue(env, "APPDATA") ??
      path.win32.join(homeDirectory, "AppData", "Roaming");
    return {
      desktopRoot: path.win32.join(appData, "Claude", "claude-code-sessions"),
    };
  }
  return {};
}

export async function loadSupplementalSessionMetadata(
  options: LoadSessionInboxOptions,
): Promise<SupplementalSessionMetadata> {
  assertNotAborted(options.signal);
  const platform = options.platform ?? process.platform;
  const desktopRecords = options.desktopRoot
    ? await loadDesktopSessionRecords(options.desktopRoot, {
        platform,
        signal: options.signal,
        maxFiles: options.maxMetadataFiles,
      })
    : [];
  assertNotAborted(options.signal);
  const conductorRecords = options.conductorDatabase
    ? await loadConductorSessionRecords(options.conductorDatabase, {
        platform,
        signal: options.signal,
        query: options.queryConductor,
      })
    : [];

  return {
    desktopBySessionId: groupBy(
      desktopRecords,
      (record) => record.cliSessionId,
      compareDesktopRecords,
    ),
    conductorBySessionId: groupBy(
      conductorRecords,
      (record) => record.cliSessionId,
      compareConductorRecords,
    ),
    conductorByWorkspacePath: groupBy(
      conductorRecords.filter((record) => record.workspacePath),
      (record) => pathIdentity(record.workspacePath ?? "", platform),
      compareConductorRecords,
    ),
  };
}

export async function loadDesktopSessionRecords(
  desktopRoot: string,
  options: {
    platform?: NodeJS.Platform;
    signal?: AbortSignal;
    maxFiles?: number;
  } = {},
): Promise<DesktopSessionRecord[]> {
  const platform = options.platform ?? process.platform;
  if (!isAbsoluteNativePath(desktopRoot, platform)) return [];
  const root = nativeResolve(desktopRoot, platform);
  const files = await findDesktopMetadataFiles(
    root,
    4,
    Math.min(options.maxFiles ?? MAX_METADATA_FILES, MAX_METADATA_FILES),
    platform,
    options.signal,
  );
  const records: DesktopSessionRecord[] = [];
  for (const filePath of files.sort(compareNativePaths(platform))) {
    assertNotAborted(options.signal);
    const record = await readDesktopSessionRecord(filePath, root, platform);
    if (record) records.push(record);
  }
  return records;
}

export async function loadConductorSessionRecords(
  databasePath: string,
  options: {
    platform?: NodeJS.Platform;
    signal?: AbortSignal;
    query?: (databasePath: string, signal?: AbortSignal) => Promise<unknown>;
  } = {},
): Promise<ConductorSessionRecord[]> {
  const platform = options.platform ?? process.platform;
  if (!isAbsoluteNativePath(databasePath, platform)) return [];
  let raw: unknown;
  try {
    raw = await (options.query ?? queryConductorDatabase)(
      databasePath,
      options.signal,
    );
  } catch {
    assertNotAborted(options.signal);
    return [];
  }
  assertNotAborted(options.signal);
  if (!Array.isArray(raw) || raw.length > MAX_METADATA_FILES) return [];

  const records: ConductorSessionRecord[] = [];
  for (const value of raw) {
    const record = parseConductorRow(value, platform);
    if (record) records.push(record);
  }
  return records.sort(compareConductorRecords);
}

export function mergeSessionInboxMetadata(
  sessionId: string,
  transcriptPath: string,
  projectPath: string,
  entrypoint: string | undefined,
  supplemental: SupplementalSessionMetadata,
  platform: NodeJS.Platform = process.platform,
): SessionInboxMetadata {
  const desktop = supplemental.desktopBySessionId.get(sessionId)?.[0];
  const conductor =
    supplemental.conductorBySessionId.get(sessionId)?.[0] ??
    supplemental.conductorByWorkspacePath.get(
      pathIdentity(projectPath, platform),
    )?.[0];
  const sources: SessionSourceDescriptor[] = [
    { backend: "claude-cli", nativePath: transcriptPath },
  ];

  if (entrypoint === "claude-vscode") {
    sources.push({ backend: "vscode", nativePath: transcriptPath });
  }
  if (desktop || entrypoint === "claude-desktop") {
    sources.push({
      backend: "claude-desktop",
      nativePath: desktop?.metadataPath,
      externalId: desktop?.bridgeId ?? desktop?.localSessionId,
      state: desktop?.isArchived ? "archived" : "active",
    });
  }
  if (conductor) {
    sources.push({
      backend: "conductor",
      nativePath: conductor.workspacePath,
      externalId: sessionId,
      workspaceId: conductor.workspaceId,
      state: conductor.state,
    });
  }

  return {
    sources: deduplicateSourceDescriptors(sources, platform),
    title: desktop?.title ?? conductor?.title,
    archived: desktop?.isArchived === true || conductor?.state === "archived",
    desktopLocalSessionId: desktop?.localSessionId,
    desktopBridgeId: desktop?.bridgeId,
    conductorWorkspaceId: conductor?.workspaceId,
    workspacePath: conductor?.workspacePath ?? projectPath,
  };
}

function parseConductorRow(
  value: unknown,
  platform: NodeJS.Platform,
): ConductorSessionRecord | undefined {
  if (!isObject(value)) return undefined;
  const row = value as ConductorPrivateRow;
  const cliSessionId = privateId(row.claude_session_id);
  if (!cliSessionId) return undefined;
  const workspacePath = privateAbsolutePath(row.workspace_path, platform);
  const workspaceId = privateId(row.workspace_id);
  const rawState = privateString(row.workspace_state, 100);
  const state =
    rawState === "archived"
      ? "archived"
      : rawState === "ready" || rawState === "active"
        ? "active"
        : undefined;
  const title = privateTitle(row.title);
  if (!title && !workspacePath && !workspaceId && !state) return undefined;
  return { cliSessionId, title, workspaceId, workspacePath, state };
}

async function queryConductorDatabase(
  databasePath: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const sql =
    "SELECT s.claude_session_id, s.title, w.id AS workspace_id, " +
    "w.workspace_path, w.state AS workspace_state FROM sessions s " +
    "LEFT JOIN workspaces w ON w.id = s.workspace_id " +
    "WHERE s.claude_session_id IS NOT NULL";
  const { stdout } = await execFilePromise(
    "sqlite3",
    ["-readonly", "-json", databasePath, sql],
    {
      encoding: "utf8",
      maxBuffer: MAX_CONDUCTOR_OUTPUT_BYTES,
      timeout: 3_000,
      windowsHide: true,
      signal,
    },
  );
  if (Buffer.byteLength(stdout, "utf8") > MAX_CONDUCTOR_OUTPUT_BYTES) {
    return [];
  }
  return stdout.trim() ? JSON.parse(stdout) : [];
}

async function readDesktopSessionRecord(
  filePath: string,
  desktopRoot: string,
  platform: NodeJS.Platform,
): Promise<DesktopSessionRecord | undefined> {
  if (!isPathInsideRoot(filePath, desktopRoot, platform)) return undefined;
  let stat: fs.Stats;
  try {
    stat = await fs.promises.stat(filePath);
  } catch {
    return undefined;
  }
  if (!stat.isFile() || stat.size <= 0 || stat.size > MAX_METADATA_FILE_BYTES) {
    return undefined;
  }
  const handle = await fs.promises.open(filePath, "r");
  try {
    const headLength = Math.min(stat.size, METADATA_WINDOW_BYTES);
    const tailStart = Math.max(0, stat.size - METADATA_WINDOW_BYTES);
    const head = new Uint8Array(headLength);
    const tail = new Uint8Array(stat.size - tailStart);
    const [headRead, tailRead] = await Promise.all([
      handle.read(head, 0, head.length, 0),
      handle.read(tail, 0, tail.length, tailStart),
    ]);
    const prefix = Buffer.from(head.subarray(0, headRead.bytesRead)).toString(
      "utf8",
    );
    const suffix = Buffer.from(tail.subarray(0, tailRead.bytesRead)).toString(
      "utf8",
    );
    const localSessionId = privateId(extractStringField(prefix, "sessionId"));
    const cliSessionId = privateId(extractStringField(prefix, "cliSessionId"));
    if (!localSessionId || !cliSessionId) return undefined;
    if (`${localSessionId}.json` !== path.basename(filePath)) return undefined;

    const bridgeId = privateBridgeId(
      extractStringField(suffix, "bridgeSessionId") ??
        extractFirstArrayString(suffix, "bridgeSessionIds") ??
        extractStringField(prefix, "bridgeSessionId") ??
        extractFirstArrayString(prefix, "bridgeSessionIds"),
    );
    return {
      cliSessionId,
      localSessionId,
      title: privateTitle(extractStringField(prefix, "title")),
      cwd: privateAbsolutePath(extractStringField(prefix, "cwd"), platform),
      bridgeId,
      isArchived: extractBooleanField(prefix, "isArchived"),
      scheduledTaskId: privateId(
        extractStringField(suffix, "scheduledTaskId") ??
          extractStringField(prefix, "scheduledTaskId"),
      ),
      metadataPath: filePath,
    };
  } finally {
    await handle.close();
  }
}

async function findDesktopMetadataFiles(
  directory: string,
  depth: number,
  remaining: number,
  platform: NodeJS.Platform,
  signal?: AbortSignal,
): Promise<string[]> {
  assertNotAborted(signal);
  if (depth < 0 || remaining <= 0) return [];
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries.sort((left, right) =>
    left.name.localeCompare(right.name),
  )) {
    assertNotAborted(signal);
    if (found.length >= remaining) break;
    const child = nativeJoin(directory, entry.name, platform);
    if (entry.isDirectory()) {
      found.push(
        ...(await findDesktopMetadataFiles(
          child,
          depth - 1,
          remaining - found.length,
          platform,
          signal,
        )),
      );
    } else if (
      entry.isFile() &&
      /^local_[A-Za-z0-9_-]{1,200}\.json$/.test(entry.name)
    ) {
      found.push(child);
    }
  }
  return found;
}

function extractStringField(input: string, field: string): string | undefined {
  const match = new RegExp(`"${field}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`).exec(
    input,
  );
  if (!match) return undefined;
  try {
    const value: unknown = JSON.parse(`"${match[1]}"`);
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function extractFirstArrayString(
  input: string,
  field: string,
): string | undefined {
  const match = new RegExp(
    `"${field}"\\s*:\\s*\\[\\s*"((?:[^"\\\\]|\\\\.)*)"`,
  ).exec(input);
  if (!match) return undefined;
  try {
    const value: unknown = JSON.parse(`"${match[1]}"`);
    return typeof value === "string" ? value : undefined;
  } catch {
    return undefined;
  }
}

function extractBooleanField(
  input: string,
  field: string,
): boolean | undefined {
  const match = new RegExp(`"${field}"\\s*:\\s*(true|false)`).exec(input);
  return match ? match[1] === "true" : undefined;
}

function privateId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$/.test(trimmed)
    ? trimmed
    : undefined;
}

function privateBridgeId(value: unknown): string | undefined {
  const id = privateId(value);
  return id && /^(?:cse|session)_/.test(id) ? id : undefined;
}

function privateTitle(value: unknown): string | undefined {
  const title = privateString(value, 500);
  return title && title !== "Untitled" ? title : undefined;
}

function privateString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value
    .split("\u0000")
    .join("")
    .replace(
      /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
      "\uFFFD",
    )
    .trim();
  return cleaned && cleaned.length <= Math.min(maxLength, MAX_STRING_LENGTH)
    ? cleaned
    : undefined;
}

function privateAbsolutePath(
  value: unknown,
  platform: NodeJS.Platform,
): string | undefined {
  const candidate = privateString(value, MAX_STRING_LENGTH);
  if (!candidate || !isAbsoluteNativePath(candidate, platform)) {
    return undefined;
  }
  return nativeNormalize(candidate, platform);
}

function deduplicateSourceDescriptors(
  sources: SessionSourceDescriptor[],
  platform: NodeJS.Platform,
): SessionSourceDescriptor[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const identity = [
      source.backend,
      source.nativePath ? pathIdentity(source.nativePath, platform) : "",
      source.externalId ?? "",
      source.workspaceId ?? "",
    ].join("\u0000");
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}

function groupBy<T>(
  values: T[],
  keyFor: (value: T) => string,
  compare: (left: T, right: T) => number,
): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  for (const group of groups.values()) group.sort(compare);
  return groups;
}

function compareDesktopRecords(
  left: DesktopSessionRecord,
  right: DesktopSessionRecord,
): number {
  return (
    Number(Boolean(right.bridgeId)) - Number(Boolean(left.bridgeId)) ||
    Number(Boolean(left.isArchived)) - Number(Boolean(right.isArchived)) ||
    left.metadataPath.localeCompare(right.metadataPath)
  );
}

function compareConductorRecords(
  left: ConductorSessionRecord,
  right: ConductorSessionRecord,
): number {
  return (
    Number(left.state === "archived") - Number(right.state === "archived") ||
    (left.workspacePath ?? "").localeCompare(right.workspacePath ?? "") ||
    (left.workspaceId ?? "").localeCompare(right.workspaceId ?? "")
  );
}

function compareNativePaths(
  platform: NodeJS.Platform,
): (left: string, right: string) => number {
  return (left, right) =>
    pathIdentity(left, platform).localeCompare(pathIdentity(right, platform));
}

function getEnvironmentValue(
  env: NodeJS.ProcessEnv,
  name: string,
): string | undefined {
  const key = Object.keys(env).find(
    (candidate) => candidate.toLocaleLowerCase() === name.toLocaleLowerCase(),
  );
  return key ? env[key] : undefined;
}

function pathIdentity(value: string, platform: NodeJS.Platform): string {
  const normalized = nativeResolve(value, platform);
  return platform === "win32" ? normalized.toLocaleLowerCase() : normalized;
}

function isPathInsideRoot(
  candidate: string,
  root: string,
  platform: NodeJS.Platform,
): boolean {
  const candidateIdentity = pathIdentity(candidate, platform);
  const rootIdentity = pathIdentity(root, platform);
  const separator = platform === "win32" ? "\\" : "/";
  return (
    candidateIdentity === rootIdentity ||
    candidateIdentity.startsWith(
      rootIdentity.endsWith(separator)
        ? rootIdentity
        : `${rootIdentity}${separator}`,
    )
  );
}

function isAbsoluteNativePath(
  value: string,
  platform: NodeJS.Platform,
): boolean {
  return platform === "win32"
    ? path.win32.isAbsolute(value)
    : path.posix.isAbsolute(value);
}

function nativeResolve(value: string, platform: NodeJS.Platform): string {
  return platform === "win32"
    ? path.win32.resolve(value)
    : path.posix.resolve(value);
}

function nativeNormalize(value: string, platform: NodeJS.Platform): string {
  return platform === "win32"
    ? path.win32.normalize(value)
    : path.posix.normalize(value);
}

function nativeJoin(
  directory: string,
  child: string,
  platform: NodeJS.Platform,
): string {
  return platform === "win32"
    ? path.win32.join(directory, child)
    : path.posix.join(directory, child);
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const error = new Error("Session Inbox Discovery Was Cancelled");
    error.name = "AbortError";
    throw error;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
