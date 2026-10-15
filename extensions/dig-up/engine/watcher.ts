// Watches the chosen folders and the code folders and asks for a sync when something changes there (DigUp:
// FolderWatcher.swift and Engine's startWatching, foldersChanged and codeChanged). fs.watch with `recursive` runs on
// FSEvents on macOS. The watcher only triggers a sync; the sync itself compares the folders with the index.

import { type FSWatcher, existsSync, opendirSync, realpathSync, statSync, watch } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config } from "./api";
import type { Log } from "./log";
import { isWalked } from "./rules";

/** Folders whose changes don't concern the code index (DigUp: Engine.codeNoise, kept as it is). */
// prettier-ignore
export const CODE_NOISE: ReadonlySet<string> = new Set([
  "node_modules", "bower_components", "venv", "site-packages", "__pycache__", "DerivedData", "Pods", "Carthage",
  "vendor", "Vendor", "third_party", "build", "Build", "dist", "out", "target", "obj", "coverage", "wandb",
  "mlruns", "lightning_logs",
]);

/** A folder that can't be watched: not there (an unplugged drive), or not readable (macOS privacy settings). */
export interface WatchProblem {
  folder: string;
  code: boolean;
  problem: "missing" | "unreadable" | "unwatchable";
  error?: string;
}

export type WatchedConfig = Pick<Config, "folders" | "skipped" | "codeFolders" | "codeQuietSeconds">;

export interface WatcherOptions {
  log: Log;
  onSync: (index: "main" | "code") => void;
  /** The folders that can't be watched, each time that list changes. */
  onProblems?: (problems: WatchProblem[]) => void;
  home?: string;
  /** DigUp: 0.75 s after the last change in the chosen folders. */
  debounceMs?: number;
  /** Overrides `codeQuietSeconds` (tests). */
  codeQuietMs?: number;
  /** DigUp codeLongestWait: the code index catches up at least this often while code keeps changing. */
  codeLongestWaitMs?: number;
  /** How often missing and unreadable folders are looked at again. */
  recheckMs?: number;
  /** Mounts and ejects show here (DigUp hears NSWorkspace's mount notifications); null: not watched. */
  volumes?: string | null;
}

function realPath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/** Paths as given and as the file system spells them (/var and /private/var), as DigUp's watcher keeps them. */
function spellings(paths: readonly string[]): string[] {
  return [...new Set(paths.flatMap((path) => [path, realPath(path)]))];
}

function errorCode(error: unknown): string {
  return (error as NodeJS.ErrnoException)?.code ?? String(error);
}

/** Why a folder can't be watched, or null. Opening it is what macOS's privacy settings refuse. */
function folderProblem(folder: string, code: boolean): WatchProblem | null {
  try {
    if (!statSync(folder).isDirectory()) return { folder, code, problem: "missing", error: "not a folder" };
    opendirSync(folder).closeSync();
    return null;
  } catch (error) {
    const why = errorCode(error);
    const problem =
      why === "ENOENT" || why === "ENOTDIR"
        ? "missing"
        : why === "EPERM" || why === "EACCES"
          ? "unreadable"
          : "unwatchable";
    return { folder, code, problem, error: why };
  }
}

interface Watched {
  folder: string;
  /** The folder as the file system spells it (/private/var for /var): event paths are compared in this form. */
  real: string;
  code: boolean;
  watcher: FSWatcher | null;
  problem: WatchProblem | null;
}

export class Watcher {
  private config: WatchedConfig = { folders: [], skipped: [], codeFolders: [], codeQuietSeconds: 60 };
  private watched: Watched[] = [];
  /** The skipped folders in both spellings, as `isWalked` compares them. */
  private skips: string[] = [];
  private mainTimer: NodeJS.Timeout | null = null;
  private codeTimer: NodeJS.Timeout | null = null;
  /** When code started changing without the code index catching up (DigUp: codeChangedSince). */
  private codeChangedSince: number | null = null;
  private recheck: NodeJS.Timeout | null = null;
  private volumes: FSWatcher | null = null;
  private volumesTimer: NodeJS.Timeout | null = null;
  private reported = "[]";
  private started = false;
  private stopped = false;
  private readonly home: string;

  constructor(private readonly o: WatcherOptions) {
    this.home = o.home ?? homedir();
  }

  /** Starts watching, or follows new settings: watchers are made again only when their folders changed. */
  update(config: WatchedConfig): void {
    if (this.stopped) return;
    const before = this.config;
    this.config = {
      folders: [...config.folders],
      skipped: [...config.skipped],
      codeFolders: [...config.codeFolders],
      codeQuietSeconds: config.codeQuietSeconds,
    };
    const first = !this.started;
    this.started = true;
    if (first || !sameList(before.skipped, config.skipped)) this.skips = spellings(config.skipped);
    if (first || !sameList(before.folders, config.folders)) this.rewatch(false);
    if (first || !sameList(before.codeFolders, config.codeFolders)) this.rewatch(true);
    this.startVolumes();
    this.startRecheck();
    this.report();
  }

  /** The folders that can't be watched now. */
  get problems(): WatchProblem[] {
    return this.watched.flatMap((w) => (w.problem ? [w.problem] : []));
  }

  stop(): void {
    this.stopped = true;
    for (const w of this.watched) w.watcher?.close();
    this.watched = [];
    this.volumes?.close();
    this.volumes = null;
    for (const timer of [this.mainTimer, this.codeTimer, this.volumesTimer]) if (timer) clearTimeout(timer);
    if (this.recheck) clearInterval(this.recheck);
    this.mainTimer = this.codeTimer = this.volumesTimer = this.recheck = null;
  }

  // ------------------------------------------------------------------------------------------------------------------

  private rewatch(code: boolean): void {
    for (const w of this.watched.filter((w) => w.code === code)) w.watcher?.close();
    this.watched = this.watched.filter((w) => w.code !== code);
    if (code) {
      // DigUp startWatchingCode: a new set of code folders starts the quiet period afresh.
      if (this.codeTimer) clearTimeout(this.codeTimer);
      this.codeTimer = null;
      this.codeChangedSince = null;
    }
    const folders = code ? this.config.codeFolders : this.config.folders;
    for (const folder of folders) this.watched.push(this.watch(folder, code));
    const count = this.watched.filter((w) => w.code === code && w.watcher).length;
    if (folders.length > 0) this.o.log.info(`watch: ${count} of ${folders.length} ${code ? "code " : ""}folders`);
  }

  private watch(folder: string, code: boolean): Watched {
    const problem = folderProblem(folder, code);
    const real = problem ? folder : realPath(folder);
    const entry: Watched = { folder, real, code, watcher: null, problem };
    if (entry.problem) {
      this.o.log.warn(`watch: can't watch ${folder} (${entry.problem.problem}: ${entry.problem.error})`);
      return entry;
    }
    try {
      const watcher = watch(folder, { recursive: true, persistent: false }, (_event, name) =>
        this.changed(entry, name === null ? null : String(name)),
      );
      // An error event without a listener would end the daemon.
      watcher.on("error", (error) => {
        this.o.log.warn(`watch: ${folder} stopped: ${errorCode(error)}`);
        watcher.close();
        if (entry.watcher !== watcher) return;
        entry.watcher = null;
        entry.problem = folderProblem(folder, code) ?? {
          folder,
          code,
          problem: "unwatchable",
          error: errorCode(error),
        };
        this.report();
      });
      entry.watcher = watcher;
    } catch (error) {
      entry.problem = { folder, code, problem: "unwatchable", error: errorCode(error) };
      this.o.log.warn(`watch: can't watch ${folder}: ${errorCode(error)}`);
    }
    return entry;
  }

  /** An event under a watched folder; `name` is relative to it (null: the folder itself). */
  private changed(entry: Watched, name: string | null): void {
    if (this.stopped || entry.watcher === null) return;
    const below = name ? name.split("/").filter((part) => part !== "") : [];
    if (entry.code) {
      // DigUp codeChanged: hidden folders (git's own files) and builds and dependencies don't count. Only the part
      // below the code folder is looked at: a code folder may itself sit somewhere hidden.
      if (below.some((part) => part.startsWith(".") || CODE_NOISE.has(part))) return;
      this.codeSoon();
      return;
    }
    // DigUp foldersChanged: only where the crawl goes (no hidden or skipped folders, no .noindex, no ~/Library). As
    // FSEvents gives DigUp, the path is the file system's spelling; the skips are in both.
    const path = below.length > 0 ? join(entry.real, ...below) : entry.real;
    if (!isWalked(path, entry.real, this.home, this.skips)) return;
    if (this.mainTimer) clearTimeout(this.mainTimer);
    this.mainTimer = setTimeout(() => {
      this.mainTimer = null;
      this.o.log.info(`watch: changed (${below.at(-1) ?? entry.folder})`);
      this.o.onSync("main");
    }, this.o.debounceMs ?? 750);
    this.mainTimer.unref();
  }

  /** Code catches up once it has been quiet for `codeQuietSeconds`, or `codeLongestWait` after it started changing. */
  private codeSoon(): void {
    const now = Date.now();
    this.codeChangedSince ??= now;
    if (this.codeTimer) clearTimeout(this.codeTimer);
    const quiet = this.o.codeQuietMs ?? this.config.codeQuietSeconds * 1000;
    const longest = this.o.codeLongestWaitMs ?? 600_000;
    const waited = now - this.codeChangedSince;
    this.codeTimer = setTimeout(
      () => {
        this.codeTimer = null;
        this.codeChangedSince = null;
        this.o.log.info("watch: code changed");
        this.o.onSync("code");
      },
      Math.max(0, Math.min(quiet, longest - waited)),
    );
    this.codeTimer.unref();
  }

  /**
   * Looks at the folders again: one that came back (a drive was connected, access was given) is watched and synced; one
   * that went is reported (its files stay in the index, as in DigUp).
   */
  private refresh(): void {
    if (this.stopped) return;
    const resync = new Set<"main" | "code">();
    this.watched = this.watched.map((entry) => {
      const there = entry.watcher !== null;
      if (there && existsSync(entry.folder)) return entry;
      if (!there) {
        const again = this.watch(entry.folder, entry.code);
        if (again.watcher) {
          this.o.log.info(`watch: ${entry.folder} is back`);
          resync.add(entry.code ? "code" : "main");
        }
        return again;
      }
      entry.watcher?.close();
      this.o.log.warn(`watch: ${entry.folder} is gone`);
      resync.add(entry.code ? "code" : "main");
      return {
        ...entry,
        watcher: null,
        problem: folderProblem(entry.folder, entry.code) ?? {
          folder: entry.folder,
          code: entry.code,
          problem: "missing",
        },
      };
    });
    if (resync.size > 0) this.skips = spellings(this.config.skipped);
    this.report();
    for (const index of resync) this.o.onSync(index);
  }

  private startRecheck(): void {
    if (this.recheck) return;
    this.recheck = setInterval(() => this.refresh(), this.o.recheckMs ?? 60_000);
    this.recheck.unref();
  }

  /** DigUp re-checks the folders when a drive is mounted or ejected; /Volumes changes then. */
  private startVolumes(): void {
    const volumes = this.o.volumes === undefined ? "/Volumes" : this.o.volumes;
    if (this.volumes || volumes === null || !existsSync(volumes)) return;
    try {
      this.volumes = watch(volumes, { persistent: false }, () => {
        if (this.volumesTimer) clearTimeout(this.volumesTimer);
        this.volumesTimer = setTimeout(() => {
          this.volumesTimer = null;
          this.refresh();
        }, 1000);
        this.volumesTimer.unref();
      });
      this.volumes.on("error", () => {
        this.volumes?.close();
        this.volumes = null;
      });
    } catch (error) {
      this.o.log.warn(`watch: can't watch ${volumes}: ${errorCode(error)}`);
    }
  }

  private report(): void {
    const problems = this.problems;
    const text = JSON.stringify(problems);
    if (text === this.reported) return;
    this.reported = text;
    this.o.onProblems?.(problems);
  }
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, at) => item === b[at]);
}
