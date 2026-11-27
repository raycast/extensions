/**
 * SQLite helpers for reading and cleaning up IDE "recent projects".
 *
 * Every VS Code based editor (VS Code, Trae, Antigravity, ...) keeps its
 * recently opened projects in the `ItemTable` of a `state.vscdb` database, but
 * neither the database location nor the storage key is consistent:
 *
 *   ~/.vscode-shared/sharedStorage/state.vscdb        -> history.recentlyOpenedPathsList
 *   ~/Library/.../Code/User/globalStorage/state.vscdb -> recently.opened
 *   Trae / Antigravity                                -> history.recentlyOpenedPathsList
 *
 * Key names have also moved between VS Code releases, and a single editor can
 * own more than one database, so we never assume that a given database uses a
 * given key: every existing database is queried for all candidate keys, the
 * results are merged and de-duplicated, and writes only touch the key the
 * records were actually found under.
 *
 * Safety: every sqlite3 call passes its arguments through execFileSync
 * (argv / stdin) and never goes through a shell, so special characters in
 * database paths or SQL are never interpreted.
 */

import { execFileSync } from "child_process";
import { copyFileSync, existsSync } from "fs";
import path from "path";
import type { IDEProvider, ProjectItem } from "../providers/types";

/** Keys used for recently opened projects across VS Code versions */
export const RECENTS_KEYS = ["history.recentlyOpenedPathsList", "recently.opened"] as const;

/** Candidate sqlite3 binaries (Raycast's GUI process has a very short PATH) */
const SQLITE_CANDIDATES = ["/usr/bin/sqlite3", "/opt/homebrew/bin/sqlite3", "/usr/local/bin/sqlite3"];

const SQLITE_TIMEOUT_MS = 10000;
const SQLITE_MAX_BUFFER = 32 * 1024 * 1024;

/** `scheme:` prefix, e.g. `vscode-remote:` or `vscode-vfs:` */
const URI_SCHEME = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

let cachedSqliteBinary: string | undefined;

function sqliteBinary(): string {
  if (!cachedSqliteBinary) {
    cachedSqliteBinary = SQLITE_CANDIDATES.find((candidate) => existsSync(candidate)) ?? "sqlite3";
  }
  return cachedSqliteBinary;
}

/** Extract the part of a sqlite3 failure that is actually useful to a user */
function describeError(error: unknown): string {
  if (error instanceof Error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const detail = stderr ? String(stderr).trim() : "";
    return detail || error.message;
  }
  return String(error);
}

/**
 * Run a single SQL statement.
 *
 * The statement is piped through stdin (execFileSync's `input`) while argv only
 * carries the executable and the database path, which avoids the shell and the
 * length limit of command line arguments at the same time.
 */
function runSqlite(dbPath: string, sql: string): string {
  try {
    return execFileSync(sqliteBinary(), [dbPath], {
      input: sql,
      encoding: "utf-8",
      timeout: SQLITE_TIMEOUT_MS,
      maxBuffer: SQLITE_MAX_BUFFER,
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new Error("sqlite3 was not found, so IDE databases cannot be read");
    }
    throw new Error(describeError(error));
  }
}

/** Read the raw value of one key, or null when it is missing or empty */
function readRawValue(dbPath: string, key: string): string | null {
  const escapedKey = key.replace(/'/g, "''");
  const output = runSqlite(dbPath, `SELECT value FROM ItemTable WHERE key = '${escapedKey}' LIMIT 1;\n`);

  // sqlite3 prints one record per line in list mode; the trailing newline is
  // not part of the value.
  const value = output.replace(/\r?\n$/, "");
  return value.length > 0 ? value : null;
}

export type RecentsContainer = "entries" | "workspaces" | "array";

export interface RecentsPayload {
  container: RecentsContainer;
  root: unknown;
  entries: unknown[];
}

/**
 * Parse a recents value.
 *
 * Three historical shapes are supported: `{ entries: [...] }`,
 * `{ workspaces: [...] }` and a bare array. Parsing starts at the first `{` or
 * `[` to tolerate leading noise such as a sqlite3 startup banner.
 */
export function parseRecentsPayload(raw: string): RecentsPayload | null {
  const start = raw.search(/[[{]/);
  if (start === -1) return null;

  let root: unknown;
  try {
    root = JSON.parse(raw.slice(start));
  } catch {
    return null;
  }

  if (Array.isArray(root)) {
    return { container: "array", root, entries: root };
  }

  if (root && typeof root === "object") {
    const record = root as Record<string, unknown>;
    if (Array.isArray(record.entries)) {
      return { container: "entries", root, entries: record.entries };
    }
    if (Array.isArray(record.workspaces)) {
      return { container: "workspaces", root, entries: record.workspaces };
    }
  }

  return null;
}

export interface RecentsSnapshot extends RecentsPayload {
  dbPath: string;
  /** The key this snapshot was read from */
  key: string;
}

/** Read the recents records of every candidate key in one database */
export function readRecentsSnapshots(dbPath: string): RecentsSnapshot[] {
  const snapshots: RecentsSnapshot[] = [];

  for (const key of RECENTS_KEYS) {
    const raw = readRawValue(dbPath, key);
    if (!raw) continue;

    const payload = parseRecentsPayload(raw);
    if (!payload) continue;

    snapshots.push({ ...payload, dbPath, key });
  }

  return snapshots;
}

/** Every database of a provider that actually exists on disk */
export function resolveDatabasePaths(provider: IDEProvider): string[] {
  return provider.getDatabasePaths().filter((dbPath) => existsSync(dbPath));
}

/**
 * The open target of one stored entry.
 */
export interface EntryLocation {
  /**
   * What gets passed to the editor:
   * - local projects are filesystem paths;
   * - remote / virtual workspaces keep their original URI
   *   (`vscode-remote://`, `vscode-vfs://`, ...).
   */
  target: string;
  type: ProjectItem["type"];
  /** Non `file:` URIs and entries with a remoteAuthority cannot be checked locally */
  isRemote: boolean;
  exists: boolean;
}

/**
 * Turn a `file:` URI into a filesystem path.
 *
 * `decodeURIComponent` throws on malformed escapes such as `%ZZ`, and one bad
 * record must not take down every other record of an editor, so fall back to
 * the raw — still readable — string instead.
 */
function decodeFileUri(uri: string): string {
  const raw = uri.slice("file:".length).replace(/^\/\//, "");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function locationFromUri(uri: string, type: ProjectItem["type"], forceRemote: boolean): EntryLocation | null {
  if (!uri) return null;

  // Remote and virtual workspaces can only be resolved by the editor itself.
  // Decoding them into a local path would produce a path that can never exist,
  // so the raw URI is kept and the entry is never treated as missing.
  if (forceRemote || (!uri.startsWith("file:") && URI_SCHEME.test(uri))) {
    return {
      target: uri,
      type: type === "workspace" ? "workspace" : "remote",
      isRemote: true,
      exists: true,
    };
  }

  // `file:` URIs and plain paths (older VS Code releases stored those) are both
  // local paths. Treating a plain path as remote would mark it as always
  // existing, which keeps stale entries out of the missing filter and cleanup.
  const filePath = uri.startsWith("file:") ? decodeFileUri(uri) : uri;

  return {
    target: filePath,
    type,
    isRemote: false,
    exists: existsSync(filePath),
  };
}

/**
 * The fields of a stored entry we care about. In real recents JSON they may be
 * missing or have an unexpected type, so everything is treated as unknown.
 */
interface RawRecentsEntry {
  folderUri?: unknown;
  fileUri?: unknown;
  remoteAuthority?: unknown;
  label?: unknown;
  workspace?: { configPath?: unknown };
}

function asRecord(entry: unknown): RawRecentsEntry | null {
  return entry && typeof entry === "object" ? (entry as RawRecentsEntry) : null;
}

/** Read the display name stored with an entry (e.g. "owner/repo [GitHub]" for remote repositories) */
export function getEntryLabel(entry: unknown): string {
  const record = asRecord(entry);
  return record && typeof record.label === "string" ? record.label.trim() : "";
}

/**
 * Resolve one stored entry into an open target; returns null for entries we
 * cannot understand.
 */
export function resolveEntryLocation(entry: unknown): EntryLocation | null {
  // Older VS Code versions stored the local path as a plain string
  if (typeof entry === "string") {
    return locationFromUri(entry, "folder", false);
  }

  const record = asRecord(entry);
  if (!record) return null;

  const isRemoteEntry = Boolean(record.remoteAuthority);
  const configPath = record.workspace?.configPath;

  if (record.folderUri) {
    return locationFromUri(String(record.folderUri), "folder", isRemoteEntry);
  }
  if (configPath) {
    return locationFromUri(String(configPath), "workspace", isRemoteEntry);
  }
  if (record.fileUri) {
    return locationFromUri(String(record.fileUri), "file", isRemoteEntry);
  }

  return null;
}

/** Resolve raw records into ProjectItems, keeping one item per target */
export function parseEntries(entries: unknown[], sourceId: string): ProjectItem[] {
  const items: ProjectItem[] = [];
  const seen = new Set<string>();

  for (const entry of entries) {
    const location = resolveEntryLocation(entry);
    if (!location) continue;
    if (seen.has(location.target)) continue;
    seen.add(location.target);

    const label = getEntryLabel(entry);
    const name = label || path.basename(location.target) || location.target;
    const extension = location.isRemote ? "" : path.extname(location.target).slice(1).toLowerCase();

    items.push({
      id: `${sourceId}:${location.target}`,
      name,
      path: location.target,
      type: location.type,
      extension,
      sources: [sourceId],
      exists: location.exists,
    });
  }

  return items;
}

/** Load every recent project of one provider, across all its databases and keys */
export function loadProjectsFromProvider(provider: IDEProvider): ProjectItem[] {
  const items: ProjectItem[] = [];

  for (const dbPath of resolveDatabasePaths(provider)) {
    let snapshots: RecentsSnapshot[];
    try {
      snapshots = readRecentsSnapshots(dbPath);
    } catch {
      // A single unreadable database (locked by the IDE, corrupted, ...) must
      // not hide the recents of the other editors.
      continue;
    }

    for (const snapshot of snapshots) {
      items.push(...parseEntries(snapshot.entries, provider.id));
    }
  }

  return items;
}

/** Merge the projects of all providers, de-duplicating by path but keeping every source */
export function mergeProjects(allProjects: ProjectItem[]): ProjectItem[] {
  const map = new Map<string, ProjectItem>();

  for (const project of allProjects) {
    const existing = map.get(project.path);
    if (existing) {
      for (const src of project.sources) {
        if (!existing.sources.includes(src)) {
          existing.sources.push(src);
        }
      }
      if (project.exists === false && project.type !== "remote") {
        existing.exists = false;
      }
    } else {
      map.set(project.path, { ...project });
    }
  }

  return Array.from(map.values());
}

/** Cleanup result of a single editor */
export interface ProviderRemovalResult {
  providerId: string;
  providerName: string;
  /** Number of existing databases that were read */
  attemptedDatabases: number;
  /** Number of records that were actually removed */
  removedCount: number;
  /** Matched key name -> removed record count */
  removedByKey: Record<string, number>;
  /** Databases that were written without a backup being created first */
  backupFailures: string[];
  /** Set when the cleanup did not fully succeed */
  error?: string;
}

/** Result of one cleanup operation */
export interface RemovalReport {
  /** Records removed across all editors */
  totalRemoved: number;
  results: ProviderRemovalResult[];
  /** Editors whose cleanup failed (the UI must not report those as removed) */
  failures: ProviderRemovalResult[];
}

/** A database path shortened to something a user can recognize in a message */
export function describeDatabase(dbPath: string): string {
  const parts = dbPath.split(path.sep).filter(Boolean);
  return parts.slice(-3, -1).join("/") || dbPath;
}

/** Write a full JSON value back to one key (callers create the backup first) */
function writeRecentsValue(dbPath: string, snapshot: RecentsSnapshot, entries: unknown[]): void {
  let root: unknown;
  if (snapshot.container === "array") {
    root = entries;
  } else {
    root = { ...(snapshot.root as Record<string, unknown>) };
    (root as Record<string, unknown>)[snapshot.container] = entries;
  }

  const json = JSON.stringify(root).replace(/'/g, "''");
  const escapedKey = snapshot.key.replace(/'/g, "''");

  runSqlite(dbPath, `UPDATE ItemTable SET value = '${json}' WHERE key = '${escapedKey}';\n`);
}

/**
 * Remove the given targets from every database of one editor.
 *
 * Only the key the records were actually found under is written back, so an
 * incorrect guess about the key name can never wipe an editor's recents. See
 * `removePathsFromAllDatabases` for the guaranteed order of backup and writes.
 */
export function removePathsFromProvider(provider: IDEProvider, targetsToRemove: string[]): ProviderRemovalResult {
  const result: ProviderRemovalResult = {
    providerId: provider.id,
    providerName: provider.name,
    attemptedDatabases: 0,
    removedCount: 0,
    removedByKey: {},
    backupFailures: [],
  };

  const removeSet = new Set(targetsToRemove);
  const errors: string[] = [];

  for (const dbPath of resolveDatabasePaths(provider)) {
    const dbLabel = describeDatabase(dbPath);

    let snapshots: RecentsSnapshot[];
    try {
      snapshots = readRecentsSnapshots(dbPath);
    } catch (error) {
      errors.push(`${dbLabel}: could not be read (${describeError(error)})`);
      continue;
    }

    result.attemptedDatabases += 1;

    // Work out what each key would look like after the removal, and skip the
    // database entirely when nothing matches.
    const pending = snapshots
      .map((snapshot) => {
        const kept = snapshot.entries.filter((entry) => {
          const location = resolveEntryLocation(entry);
          // Entries we cannot resolve are always kept, to avoid deleting the wrong thing
          return !location || !removeSet.has(location.target);
        });
        return {
          snapshot,
          kept,
          removed: snapshot.entries.length - kept.length,
        };
      })
      .filter((item) => item.removed > 0);

    if (pending.length === 0) continue;

    // Exactly one backup per database, and always before the first write:
    // backing up per key would replace the original copy with an already
    // modified database.
    let backupFailed = false;
    try {
      copyFileSync(dbPath, `${dbPath}.bak`);
    } catch {
      backupFailed = true;
    }

    let writtenKeys = 0;
    for (const { snapshot, kept, removed } of pending) {
      try {
        writeRecentsValue(dbPath, snapshot, kept);
      } catch (error) {
        errors.push(`${dbLabel} (${snapshot.key}): could not be written (${describeError(error)})`);
        continue;
      }

      writtenKeys += 1;
      result.removedCount += removed;
      result.removedByKey[snapshot.key] = (result.removedByKey[snapshot.key] ?? 0) + removed;
    }

    if (backupFailed && writtenKeys > 0 && !result.backupFailures.includes(dbPath)) {
      result.backupFailures.push(dbPath);
    }
  }

  if (errors.length > 0) {
    result.error = errors.join("; ");
  }

  return result;
}

/** Remove the given targets from every database of every registered editor */
export function removePathsFromAllDatabases(providers: IDEProvider[], targetsToRemove: string[]): RemovalReport {
  const results = providers.map((provider) => removePathsFromProvider(provider, targetsToRemove));

  return {
    totalRemoved: results.reduce((sum, item) => sum + item.removedCount, 0),
    results,
    failures: results.filter((item) => Boolean(item.error)),
  };
}
