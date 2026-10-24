import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access, opendir } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { parsePlist, type PlistValue } from "./plist";

export const BUNDLE_ID = "com.abdurrahim.DigUp";
/** `search-service` first shipped in 0.6.1. */
export const MIN_VERSION = "0.6.1";

/** DigUp's own settings, as it saves them (DigUp's AppSettings.swift). */
export interface DigUpSettings {
  indexDir: string;
  modelsDir?: string;
  roots: string[];
  excludedFolders: string[];
  excludedTypes: string[];
  codeRoots: string[];
  codeExcludedFolders: string[];
  /** A bundle id; "" means each file's default app; undefined means DigUp hasn't been told. */
  codeEditor?: string;
}

export type SettingsOverride = Partial<Pick<DigUpSettings, "indexDir" | "roots" | "codeRoots">>;

export interface Launch {
  program: string;
  args: string[];
  env: Record<string, string>;
}

export type Readiness =
  | { state: "ready"; appPath: string; version: string; settings: DigUpSettings; launch: Launch; hasCode: boolean }
  | { state: "not-installed" }
  /** Too old, or (`helperMissing`) new enough but without a helper that can be run. */
  | { state: "outdated"; appPath: string; version: string; helperMissing?: true }
  | { state: "no-index"; appPath: string }
  | { state: "no-access"; appPath: string; folder: string };

export type Access = "ok" | "denied" | "missing";

/** What the checks ask of the Mac, so tests can stand in for it. */
export interface System {
  home: string;
  exists(path: string): Promise<boolean>;
  isExecutable(path: string): Promise<boolean>;
  version(appPath: string): Promise<string | undefined>;
  /** The XML `defaults export com.abdurrahim.DigUp -` prints. */
  exportDefaults(): Promise<string>;
  access(folder: string): Promise<Access>;
}

export function defaultIndexDir(home: string): string {
  return join(home, "Library", "Application Support", "DigUp", "index.noindex");
}

function expand(path: string, home: string): string {
  if (path === "~") return home;
  return path.startsWith("~/") ? join(home, path.slice(2)) : path;
}

function strings(value: PlistValue | undefined): string[] {
  if (typeof value === "string") return [value];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** "HEIC, .png" → ["heic", "png"], as DigUp reads its own list. */
function extensions(list: string): string[] {
  return list
    .split(",")
    .map((item) => item.trim().toLowerCase().replace(/^\./, ""))
    .filter(Boolean);
}

export function parseSettings(xml: string, home: string): DigUpSettings {
  const parsed = parsePlist(xml);
  const saved = typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  const folders = (key: string) =>
    strings(saved[key])
      .filter(Boolean)
      .map((path) => expand(path, home));
  const indexDir = saved.indexDir;
  const settings: DigUpSettings = {
    indexDir: typeof indexDir === "string" && indexDir ? expand(indexDir, home) : defaultIndexDir(home),
    roots: folders("roots"),
    excludedFolders: folders("excludedFolders"),
    excludedTypes: strings(saved.excludedTypes).flatMap(extensions),
    codeRoots: folders("codeRoots"),
    codeExcludedFolders: folders("codeExcludedFolders"),
  };
  const modelsDir = saved.modelsDir;
  if (typeof modelsDir === "string" && modelsDir) settings.modelsDir = expand(modelsDir, home);
  if (typeof saved.codeEditor === "string") settings.codeEditor = saved.codeEditor;
  return settings;
}

/** `~/.config/digup-raycast/dev-settings.json`, honored in development only (see the README). */
export function parseOverride(json: string, home: string): SettingsOverride {
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return {};
  }
  if (typeof value !== "object" || value === null) return {};
  const saved = value as Record<string, unknown>;
  const override: SettingsOverride = {};
  const paths = (list: unknown) =>
    Array.isArray(list) && list.every((item) => typeof item === "string")
      ? (list as string[]).map((path) => expand(path, home))
      : undefined;
  if (typeof saved.indexDir === "string" && saved.indexDir) override.indexDir = expand(saved.indexDir, home);
  const roots = paths(saved.roots);
  if (roots) override.roots = roots;
  const codeRoots = paths(saved.codeRoots);
  if (codeRoots) override.codeRoots = codeRoots;
  return override;
}

/** -1, 0 or 1. Only the numbers count: "0.10.0" is newer than "0.6.1". */
export function compareVersions(a: string, b: string): number {
  const numbers = (version: string) => version.split(".").map((part) => parseInt(part, 10) || 0);
  const [left, right] = [numbers(a), numbers(b)];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  return 0;
}

export function helperPath(appPath: string): string {
  return join(appPath, "Contents", "Helpers", "digup");
}

/**
 * How `digup search-service` is started. Code folders go along only when the code index exists: told about them
 * without one, the helper would create an empty code index in DigUp's folder.
 */
export function buildLaunch(appPath: string, settings: DigUpSettings, hasCode: boolean): Launch {
  const each = (flag: string, values: string[]) => values.flatMap((value) => [flag, value]);
  return {
    program: helperPath(appPath),
    args: [
      "search-service",
      ...settings.roots,
      "--index",
      settings.indexDir,
      ...each("--exclude", settings.excludedFolders),
      ...each("--exclude-ext", settings.excludedTypes),
      ...(hasCode ? each("--code-root", settings.codeRoots) : []),
      ...(hasCode ? each("--code-exclude", settings.codeExcludedFolders) : []),
    ],
    env: settings.modelsDir ? { DIGUP_MODELS: settings.modelsDir } : {},
  };
}

/**
 * Whether search can start, checked in the order a person would fix things. The index must be there before the
 * helper runs: it creates an empty one otherwise.
 */
export async function checkReadiness(
  candidates: string[],
  system: System,
  override: SettingsOverride = {},
): Promise<Readiness> {
  let appPath: string | undefined;
  for (const path of [...candidates, "/Applications/DigUp.app", join(system.home, "Applications", "DigUp.app")]) {
    if (await system.exists(path)) {
      appPath = path;
      break;
    }
  }
  if (!appPath) return { state: "not-installed" };
  const version = await system.version(appPath);
  if (version === undefined || compareVersions(version, MIN_VERSION) < 0) {
    return { state: "outdated", appPath, version: version ?? "unknown" };
  }
  if (!(await system.isExecutable(helperPath(appPath)))) {
    return { state: "outdated", appPath, version, helperMissing: true };
  }
  const settings = { ...parseSettings(await system.exportDefaults(), system.home), ...override };
  if (!(await system.exists(join(settings.indexDir, "index.sqlite")))) return { state: "no-index", appPath };
  for (const folder of settings.roots) {
    if ((await system.access(folder)) === "denied") return { state: "no-access", appPath, folder };
  }
  const hasCode = await system.exists(join(settings.indexDir, "code.sqlite"));
  return { state: "ready", appPath, version, settings, launch: buildLaunch(appPath, settings, hasCode), hasCode };
}

const run = promisify(execFile);

export function realSystem(): System {
  return {
    home: homedir(),
    exists: (path) =>
      access(path).then(
        () => true,
        () => false,
      ),
    isExecutable: (path) =>
      access(path, constants.X_OK).then(
        () => true,
        () => false,
      ),
    version: async (appPath) => {
      try {
        const plist = join(appPath, "Contents", "Info.plist");
        const { stdout } = await run("/usr/bin/plutil", [
          "-extract",
          "CFBundleShortVersionString",
          "raw",
          "-o",
          "-",
          plist,
        ]);
        return stdout.trim() || undefined;
      } catch {
        return undefined;
      }
    },
    exportDefaults: async () => {
      try {
        const { stdout } = await run("/usr/bin/defaults", ["export", BUNDLE_ID, "-"], { maxBuffer: 8 * 1024 * 1024 });
        return stdout;
      } catch {
        return "";
      }
    },
    // Opening the folder is what macOS privacy protection refuses (EPERM), and what makes it ask the first time.
    access: async (folder) => {
      try {
        const directory = await opendir(folder);
        await directory.close();
        return "ok";
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EPERM" || code === "EACCES") return "denied";
        return code === "ENOENT" || code === "ENOTDIR" ? "missing" : "ok";
      }
    },
  };
}
