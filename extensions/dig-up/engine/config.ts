// The daemon's settings file, <support>/config.json (api.ts `Config`; DigUp: AppSettings and AppController's
// applyFolders). The menu bar reads `folders` and `codeFolders` from this file when no daemon runs, so every change is
// saved at once, atomically.

import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readFileSync,
  realpathSync,
  renameSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute } from "node:path";
import type { Config } from "./api";
import type { Log } from "./log";
import { FolderSelection, parseExtensions } from "./rules";

export const DEFAULT_CONFIG: Readonly<Config> = Object.freeze({
  folders: [],
  skipped: [],
  codeFolders: [],
  codeSkipped: [],
  excludedExtensions: [],
  indexOnBattery: true,
  indexHours: null,
  paused: false,
  codeQuietSeconds: 60,
  llamaServerPath: null,
  modelFolder: null,
});

export function defaultConfig(): Config {
  return structuredClone(DEFAULT_CONFIG) as Config;
}

/** A setting that can't be taken as given (the daemon answers 400). */
export class ConfigError extends Error {
  readonly status = 400;
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

/** How paths are made comparable: "~" expanded, symlinks resolved. Injectable for tests. */
export interface Normalizer {
  home?: string;
  /** A path that can't be resolved (a drive that isn't connected) comes back as given, as DigUp's folderURL does. */
  resolve?: (path: string) => string;
}

function realPath(path: string): string {
  try {
    return realpathSync.native(path);
  } catch {
    return path;
  }
}

/** "~/Documents/" → "/Users/me/Documents": trims spaces, expands "~", drops trailing slashes. */
export function expandTilde(path: string, home: string = homedir()): string {
  const trimmed = path.trim();
  const expanded = trimmed === "~" ? home : trimmed.startsWith("~/") ? home + trimmed.slice(1) : trimmed;
  return expanded.length > 1 ? expanded.replace(/\/+$/, "") : expanded;
}

/** Expanded, resolved, each once; blanks dropped. Relative paths mean nothing to a daemon whose cwd is "/": they throw,
 *  or are dropped when `onRelative` is given (a hand-edited file). */
function folderPaths(paths: readonly string[], n: Normalizer, onRelative?: (path: string) => void): string[] {
  const home = n.home ?? homedir();
  const resolve = n.resolve ?? realPath;
  const out: string[] = [];
  for (const raw of paths) {
    const expanded = expandTilde(raw, home);
    if (expanded === "") continue;
    if (!isAbsolute(expanded)) {
      if (!onRelative) throw new ConfigError(`“${raw}” isn't a full path`);
      onRelative(raw);
      continue;
    }
    const resolved = resolve(expanded);
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out;
}

/** DigUp applyFolders: a folder another chosen one already searches is dropped (its files would be found twice), and
 *  so is a skip with nothing around it to skip from. */
function selection(
  chosen: readonly string[],
  skipped: readonly string[],
  n: Normalizer,
  onRelative?: (path: string) => void,
) {
  const s = new FolderSelection({
    chosen: folderPaths(chosen, n, onRelative),
    skipped: folderPaths(skipped, n, onRelative),
  });
  return { folders: s.folders, skipped: s.effectiveSkips };
}

function optionalPath(path: string | null, n: Normalizer): string | null {
  if (path === null) return null;
  const expanded = expandTilde(path, n.home ?? homedir());
  return expanded === "" ? null : expanded;
}

/** The settings in their one stored form. A relative folder throws ConfigError, or is dropped with `onRelative`. */
export function normalizeConfig(config: Config, n: Normalizer = {}, onRelative?: (path: string) => void): Config {
  const main = selection(config.folders, config.skipped, n, onRelative);
  const code = selection(config.codeFolders, config.codeSkipped, n, onRelative);
  return {
    ...config,
    folders: main.folders,
    skipped: main.skipped,
    codeFolders: code.folders,
    codeSkipped: code.skipped,
    excludedExtensions: parseExtensions(config.excludedExtensions.join(" ")).sort(),
    // DigUp: max(1, codeQuietSeconds).
    codeQuietSeconds: Math.max(1, config.codeQuietSeconds),
    // Start = end means all day (DigUp IndexHours): the same as none.
    indexHours: config.indexHours && config.indexHours.start !== config.indexHours.end ? config.indexHours : null,
    llamaServerPath: optionalPath(config.llamaServerPath, n),
    modelFolder: optionalPath(config.modelFolder, n),
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// Checking what comes in (POST /config bodies and the file)

const isStringList = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === "string");
const isHour = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 24;

/** Why `value` can't be setting `key`, or null when it can. Keys this daemon doesn't know pass as they are. */
function problem(key: string, value: unknown): string | null {
  switch (key as keyof Config) {
    case "folders":
    case "skipped":
    case "codeFolders":
    case "codeSkipped":
    case "excludedExtensions":
      return isStringList(value) ? null : `${key} must be a list of strings`;
    case "indexOnBattery":
    case "paused":
      return typeof value === "boolean" ? null : `${key} must be true or false`;
    case "indexHours": {
      if (value === null) return null;
      const hours = value as { start?: unknown; end?: unknown } | undefined;
      return typeof hours === "object" && isHour(hours.start) && isHour(hours.end)
        ? null
        : "indexHours must be null or {start, end} in whole hours (0-24)";
    }
    case "codeQuietSeconds":
      return typeof value === "number" && Number.isFinite(value) ? null : "codeQuietSeconds must be a number";
    case "llamaServerPath":
    case "modelFolder":
      return value === null || typeof value === "string" ? null : `${key} must be a path or null`;
    default:
      return null;
  }
}

function hoursOf(value: Config["indexHours"]): Config["indexHours"] {
  return value === null ? null : { start: value.start % 24, end: value.end % 24 };
}

/** A partial POST /config body, checked. Throws ConfigError on a wrong type. */
export function parsePatch(body: unknown): Partial<Config> {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    throw new ConfigError("the settings must be a JSON object");
  }
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const why = problem(key, value);
    if (why) throw new ConfigError(why);
    patch[key] = key === "indexHours" ? hoursOf(value as Config["indexHours"]) : value;
  }
  return patch as Partial<Config>;
}

/** The file's settings over the defaults; a value of the wrong type falls back to its default (and is logged). */
function fromFile(parsed: Record<string, unknown>, log: Log): Config {
  const config = defaultConfig() as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(parsed)) {
    const why = problem(key, value);
    if (why) {
      log.warn(`config: ${why}; using the default`);
      continue;
    }
    config[key] = key === "indexHours" ? hoursOf(value as Config["indexHours"]) : value;
  }
  return config as unknown as Config;
}

// ---------------------------------------------------------------------------------------------------------------------
// The file

/** Reads the settings. Missing: the defaults. Unreadable as settings: the defaults, and the file is moved aside to
 *  `config.json.broken` (so the user's folders aren't lost) and replaced by the defaults. */
export function loadConfig(file: string, log: Log, n: Normalizer = {}): Config {
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") log.warn(`config: can't read ${file}: ${error}`);
    return normalizeConfig(defaultConfig(), n);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    parsed = error;
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed) || parsed instanceof Error) {
    log.warn(
      `config: ${file} isn't settings (${parsed instanceof Error ? parsed.message : typeof parsed}); kept as ` +
        `config.json.broken, starting from the defaults`,
    );
    const config = normalizeConfig(defaultConfig(), n);
    try {
      renameSync(file, `${file}.broken`);
      saveConfig(file, config);
    } catch (error) {
      log.error(`config: can't replace the broken settings: ${error}`);
    }
    return config;
  }
  return normalizeConfig(fromFile(parsed as Record<string, unknown>, log), n, (path) =>
    log.warn(`config: “${path}” isn't a full path; left out`),
  );
}

/** Writes a temporary file beside `file`, flushes it, and renames it over `file`: a reader sees the old settings or
 *  the new ones, never half of them. */
export function saveConfig(file: string, config: Config): void {
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  const fd = openSync(temporary, "w", 0o644);
  try {
    writeSync(fd, JSON.stringify(config, null, 2) + "\n");
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  try {
    renameSync(temporary, file);
  } catch (error) {
    try {
      unlinkSync(temporary);
    } catch {
      // nothing to clean up
    }
    throw error;
  }
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export type ConfigListener = (next: Config, previous: Config, changed: ReadonlySet<keyof Config>) => void;

/** The settings in memory and on disk. Listeners hear every change, after it is saved. */
export class ConfigStore {
  private current: Config;
  private readonly listeners = new Set<ConfigListener>();

  constructor(
    readonly file: string,
    private readonly log: Log,
    private readonly normalizer: Normalizer = {},
  ) {
    this.current = loadConfig(file, log, normalizer);
  }

  get(): Config {
    return structuredClone(this.current);
  }

  /** Listens for changes; returns the unsubscribe. */
  onChange(listener: ConfigListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Merges a partial body (checked with parsePatch) over the current settings, normalizes, and saves, on every call:
   * the file exists from the first POST /config. Throws ConfigError on a wrong type, and the save's error when the
   * file can't be written (then nothing changes).
   */
  update(body: unknown): { config: Config; changed: ReadonlySet<keyof Config> } {
    const patch = parsePatch(body);
    const previous = this.current;
    const next = normalizeConfig({ ...previous, ...patch }, this.normalizer);
    saveConfig(this.file, next);
    const changed = new Set<keyof Config>();
    for (const key of new Set([...Object.keys(previous), ...Object.keys(next)]) as Set<keyof Config>) {
      if (!same(previous[key], next[key])) changed.add(key);
    }
    this.current = next;
    if (changed.size > 0) {
      this.log.info(`config: ${[...changed].join(", ")} changed`);
      for (const listener of this.listeners) {
        try {
          listener(this.get(), structuredClone(previous), changed);
        } catch (error) {
          this.log.error(`config: a listener failed: ${(error as Error)?.stack ?? error}`);
        }
      }
    }
    return { config: this.get(), changed };
  }
}
