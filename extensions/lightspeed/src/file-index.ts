import { execFile } from "node:child_process";
import { existsSync, watch, type FSWatcher } from "node:fs";
import { mkdir, opendir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, normalize, resolve } from "node:path";
import { DatabaseSync, type StatementSync } from "node:sqlite";
import { compileSearchQuery } from "./query";
import type { SearchResult, SearchScope } from "./types";

export interface IndexStatus {
  phase: "loading" | "indexing" | "ready" | "error";
  indexedCount: number;
  scannedCount: number;
  message?: string;
}

interface DatabaseRow {
  path: string;
  name: string;
  is_directory: number;
}

type Listener = () => void;

const BUILT_IN_EXCLUSIONS = new Set(["$recycle.bin", "system volume information"]);
const DATABASE_NAME = "lightspeed-index-v4.sqlite";
const NOTIFY_INTERVAL_MS = 250;
const COMMIT_INTERVAL = 50_000;
const FULL_REFRESH_INTERVAL_MS = 7 * 24 * 60 * 60 * 1_000;
const WATCH_DEBOUNCE_MS = 750;

function expandEnvironmentVariables(value: string): string {
  return value.replace(/%([^%]+)%/g, (_, name: string) => process.env[name] ?? `%${name}%`);
}

function pathFingerprint(value: string): [number, number] {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return [first, second];
}

async function fixedDrives(): Promise<string[]> {
  return new Promise((resolveDrives) => {
    execFile(
      "powershell.exe",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object -ExpandProperty DeviceID",
      ],
      { windowsHide: true, timeout: 10_000 },
      (error, stdout) => {
        const drives = stdout
          .split(/\r?\n/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((drive) => `${drive}\\`);
        resolveDrives(error || drives.length === 0 ? [`${process.env.SystemDrive ?? "C:"}\\`] : drives);
      },
    );
  });
}

export class FileIndex {
  private listeners = new Set<Listener>();
  private started = false;
  private scanController?: AbortController;
  private lastNotification = 0;
  private watchers: FSWatcher[] = [];
  private pendingChanges = new Set<string>();
  private changeTimer?: NodeJS.Timeout;
  private applyingChanges = false;
  private database?: DatabaseSync;
  private upsertStatement?: StatementSync;
  private readonly databasePath: string;

  status: IndexStatus = { phase: "loading", indexedCount: 0, scannedCount: 0 };

  constructor(
    private readonly rootPreference = "",
    private readonly excludedPreference = "",
    supportPath = join(homedir(), ".lightspeed"),
  ) {
    this.databasePath = join(supportPath, DATABASE_NAME);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    await this.openDatabase();
    const roots = await this.roots();
    const exclusions = this.exclusions();
    const configurationKey = JSON.stringify({ roots, exclusions });
    const storedConfiguration = this.getMetadata("configuration");
    const lastFullScan = Number(this.getMetadata("last_full_scan") ?? 0);
    const requiresRefresh =
      this.status.indexedCount === 0 ||
      storedConfiguration !== configurationKey ||
      Date.now() - lastFullScan > FULL_REFRESH_INTERVAL_MS;

    if (requiresRefresh) void this.rebuild();
    else this.startWatchers(roots, exclusions);
  }

  async rebuild(): Promise<void> {
    await this.openDatabase();
    this.scanController?.abort();
    this.stopWatchers();
    const controller = new AbortController();
    this.scanController = controller;
    await this.scan(controller.signal);
  }

  search(query: string, scope: SearchScope, limit: number): SearchResult[] {
    if (!this.database) return [];
    const compiled = compileSearchQuery(query, scope, limit, this.status.phase !== "indexing");
    const rows = this.database.prepare(compiled.sql).all(...compiled.parameters) as unknown as DatabaseRow[];
    return rows.map((row) => ({
      name: row.name,
      parentPath: dirname(row.path),
      fullPath: row.path,
      isDirectory: row.is_directory === 1,
    }));
  }

  private async openDatabase(): Promise<void> {
    if (this.database) return;
    this.status = { phase: "loading", indexedCount: 0, scannedCount: 0 };
    await mkdir(dirname(this.databasePath), { recursive: true });
    this.database = new DatabaseSync(this.databasePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA temp_store = FILE;
      PRAGMA cache_size = -4096;
      PRAGMA mmap_size = 0;
      PRAGMA journal_size_limit = 16777216;
      PRAGMA auto_vacuum = NONE;
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY,
        path TEXT NOT NULL COLLATE NOCASE,
        path_hash_1 INTEGER NOT NULL,
        path_hash_2 INTEGER NOT NULL,
        name TEXT NOT NULL,
        extension TEXT NOT NULL,
        is_directory INTEGER NOT NULL,
        generation INTEGER NOT NULL,
        UNIQUE(path_hash_1, path_hash_2)
      );
      CREATE VIRTUAL TABLE IF NOT EXISTS files_fts USING fts5(
        name,
        content='files',
        content_rowid='id',
        tokenize='trigram',
        detail=none,
        columnsize=0
      );
    `);
    this.restoreSearchStructures(false);
    this.database.function("regexp", { deterministic: true }, (pattern, value) => {
      try {
        return new RegExp(String(pattern), "i").test(String(value)) ? 1 : 0;
      } catch {
        return 0;
      }
    });
    this.upsertStatement = this.database.prepare(`
      INSERT INTO files(path, path_hash_1, path_hash_2, name, extension, is_directory, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(path_hash_1, path_hash_2) DO UPDATE SET
        generation=excluded.generation
    `);
    const row = this.database.prepare("SELECT count(*) AS count FROM files").get() as { count: number };
    this.status = { phase: "ready", indexedCount: Number(row.count), scannedCount: Number(row.count) };
    this.notify(true);
  }

  private getMetadata(key: string): string | undefined {
    const row = this.database?.prepare("SELECT value FROM metadata WHERE key = ?").get(key) as
      { value: string } | undefined;
    return row?.value;
  }

  private setMetadata(key: string, value: string): void {
    this.database
      ?.prepare("INSERT INTO metadata(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value")
      .run(key, value);
  }

  private restoreSearchStructures(rebuildFullText: boolean): void {
    if (!this.database) return;
    if (rebuildFullText) this.database.exec("INSERT INTO files_fts(files_fts) VALUES ('rebuild')");
    this.database.exec(`
      CREATE INDEX IF NOT EXISTS files_extension ON files(extension, is_directory);
      CREATE TRIGGER IF NOT EXISTS files_insert AFTER INSERT ON files BEGIN
        INSERT INTO files_fts(rowid, name) VALUES (new.id, new.name);
      END;
      CREATE TRIGGER IF NOT EXISTS files_delete AFTER DELETE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, name) VALUES ('delete', old.id, old.name);
      END;
      CREATE TRIGGER IF NOT EXISTS files_update AFTER UPDATE ON files BEGIN
        INSERT INTO files_fts(files_fts, rowid, name) VALUES ('delete', old.id, old.name);
        INSERT INTO files_fts(rowid, name) VALUES (new.id, new.name);
      END;
    `);
  }

  private enterBulkIndexMode(): void {
    this.database?.exec(`
      DROP TRIGGER IF EXISTS files_insert;
      DROP TRIGGER IF EXISTS files_delete;
      DROP TRIGGER IF EXISTS files_update;
      DROP INDEX IF EXISTS files_extension;
    `);
  }

  private notify(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastNotification < NOTIFY_INTERVAL_MS) return;
    this.lastNotification = now;
    this.listeners.forEach((listener) => listener());
  }

  private async roots(): Promise<string[]> {
    const configured = this.rootPreference
      .split(/[;\r\n]+/)
      .map((value) => expandEnvironmentVariables(value.trim()))
      .filter(Boolean)
      .map((value) => normalize(isAbsolute(value) ? value : resolve(homedir(), value)));
    return configured.length > 0 ? [...new Set(configured)] : fixedDrives();
  }

  private exclusions(): string[] {
    return this.excludedPreference
      .split(/[;\r\n]+/)
      .map((value) => expandEnvironmentVariables(value.trim()).toLowerCase())
      .filter(Boolean);
  }

  private shouldExclude(path: string, name: string, exclusions: string[]): boolean {
    const lowerName = name.toLowerCase();
    const lowerPath = path.toLowerCase();
    const privateIndexPath = dirname(this.databasePath).toLowerCase();
    return (
      BUILT_IN_EXCLUSIONS.has(lowerName) ||
      lowerPath === privateIndexPath ||
      lowerPath.startsWith(`${privateIndexPath}\\`) ||
      exclusions.some((value) => lowerName === value || lowerPath.startsWith(value))
    );
  }

  private upsert(fullPath: string, isDirectory: boolean, generation: number): void {
    const name = basename(fullPath) || fullPath;
    const [firstHash, secondHash] = pathFingerprint(fullPath.toLowerCase());
    this.upsertStatement?.run(
      fullPath,
      firstHash,
      secondHash,
      name,
      isDirectory ? "" : extname(name).slice(1).toLowerCase(),
      isDirectory ? 1 : 0,
      generation,
    );
  }

  private async scan(signal: AbortSignal): Promise<void> {
    if (!this.database) return;
    const roots = await this.roots();
    const exclusions = this.exclusions();
    const directories = roots.filter(existsSync);
    const generation = Date.now();
    let scannedCount = 0;
    let transactionOpen = false;

    this.status = { phase: "indexing", indexedCount: this.status.indexedCount, scannedCount: 0 };
    this.notify(true);

    try {
      this.enterBulkIndexMode();
      this.database.exec("BEGIN");
      transactionOpen = true;
      while (directories.length > 0 && !signal.aborted) {
        const batch = directories.splice(0, 64);
        const discovered = await Promise.all(
          batch.map(async (directory) => {
            const children: string[] = [];
            try {
              const handle = await opendir(directory);
              for await (const item of handle) {
                if (signal.aborted) break;
                const fullPath = join(directory, item.name);
                if (this.shouldExclude(fullPath, item.name, exclusions) || item.isSymbolicLink()) continue;
                this.upsert(fullPath, item.isDirectory(), generation);
                if (item.isDirectory()) children.push(fullPath);
                scannedCount += 1;
                if (scannedCount % COMMIT_INTERVAL === 0) {
                  this.database?.exec("COMMIT; BEGIN");
                }
              }
            } catch {
              // Protected and transient paths are skipped without interrupting the index.
            }
            return children;
          }),
        );
        directories.push(...discovered.flat());
        this.status = {
          phase: "indexing",
          indexedCount: Math.max(this.status.indexedCount, scannedCount),
          scannedCount,
        };
        this.notify();
      }

      if (signal.aborted) {
        this.database.exec("COMMIT");
        transactionOpen = false;
        this.restoreSearchStructures(true);
        return;
      }
      this.database.exec("COMMIT");
      transactionOpen = false;
      this.database.prepare("DELETE FROM files WHERE generation <> ?").run(generation);
      this.restoreSearchStructures(true);
      this.setMetadata("configuration", JSON.stringify({ roots, exclusions }));
      this.setMetadata("last_full_scan", String(Date.now()));
      this.database.exec("PRAGMA wal_checkpoint(TRUNCATE)");
      const count = this.database.prepare("SELECT count(*) AS count FROM files").get() as { count: number };
      this.status = { phase: "ready", indexedCount: Number(count.count), scannedCount };
      this.startWatchers(roots, exclusions);
      this.notify(true);
    } catch (error) {
      if (transactionOpen) {
        try {
          this.database.exec("ROLLBACK");
        } catch {
          // The transaction may already have been committed at a batch boundary.
        }
      }
      this.restoreSearchStructures(true);
      if (signal.aborted) return;
      this.status = {
        phase: "error",
        indexedCount: this.status.indexedCount,
        scannedCount,
        message: `Indexing failed: ${String(error)}`,
      };
      this.notify(true);
    }
  }

  private stopWatchers(): void {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers = [];
  }

  private startWatchers(roots: string[], exclusions: string[]): void {
    this.stopWatchers();
    for (const root of roots) {
      try {
        const watcher = watch(root, { recursive: true }, (_event, filename) => {
          if (!filename) return;
          const fullPath = join(root, filename.toString());
          if (this.shouldExclude(fullPath, basename(fullPath), exclusions)) return;
          this.pendingChanges.add(fullPath);
          if (this.changeTimer) clearTimeout(this.changeTimer);
          this.changeTimer = setTimeout(() => void this.applyPendingChanges(), WATCH_DEBOUNCE_MS);
        });
        watcher.unref();
        this.watchers.push(watcher);
      } catch {
        // The periodic refresh reconciles filesystems that cannot be watched recursively.
      }
    }
  }

  private async applyPendingChanges(): Promise<void> {
    if (!this.database) return;
    if (this.applyingChanges) {
      if (this.changeTimer) clearTimeout(this.changeTimer);
      this.changeTimer = setTimeout(() => void this.applyPendingChanges(), WATCH_DEBOUNCE_MS);
      return;
    }
    if (this.status.phase === "indexing") {
      this.pendingChanges.clear();
      return;
    }
    const changedPaths = [...this.pendingChanges];
    this.pendingChanges.clear();
    if (changedPaths.length === 0) return;
    const generation = Date.now();
    let transactionOpen = false;
    this.applyingChanges = true;
    try {
      this.database.exec("BEGIN");
      transactionOpen = true;
      const remove = this.database.prepare(
        "DELETE FROM files WHERE (path_hash_1 = ? AND path_hash_2 = ?) OR path LIKE ?",
      );
      for (const fullPath of changedPaths) {
        try {
          const details = await stat(fullPath);
          this.upsert(fullPath, details.isDirectory(), generation);
        } catch {
          const [firstHash, secondHash] = pathFingerprint(fullPath.toLowerCase());
          remove.run(firstHash, secondHash, `${fullPath}\\%`);
        }
      }
      this.database.exec("COMMIT");
      transactionOpen = false;
    } catch {
      if (transactionOpen) {
        try {
          this.database.exec("ROLLBACK");
        } catch {
          // The database may already have closed the failed transaction.
        }
      }
    } finally {
      this.applyingChanges = false;
      if (this.pendingChanges.size > 0) {
        this.changeTimer = setTimeout(() => void this.applyPendingChanges(), WATCH_DEBOUNCE_MS);
      }
    }
  }
}

let singleton: FileIndex | undefined;
let singletonKey = "";

export function getFileIndex(rootPreference = "", excludedPreference = "", supportPath?: string): FileIndex {
  const key = `${rootPreference}\0${excludedPreference}\0${supportPath ?? ""}`;
  if (!singleton || singletonKey !== key) {
    singleton = new FileIndex(rootPreference, excludedPreference, supportPath);
    singletonKey = key;
  }
  return singleton;
}
