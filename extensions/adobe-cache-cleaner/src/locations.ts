import { execFile } from "child_process";
import { Dirent } from "fs";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { getApplications, getPreferenceValues } from "@raycast/api";

const run = promisify(execFile);

// Raycast runs commands with a minimal PATH, so call system tools by absolute path.
const PLUTIL = "/usr/bin/plutil";

export const HOME = os.homedir();
const LIBRARY = path.join(HOME, "Library");
const CACHES = path.join(LIBRARY, "Caches");
const PREFS = path.join(LIBRARY, "Preferences");
const DEFAULT_COMMON = path.join(LIBRARY, "Application Support", "Adobe", "Common");
const AE_PREFS_ROOT = path.join(PREFS, "Adobe", "After Effects");
const AE_CACHES_ROOT = path.join(CACHES, "Adobe", "After Effects");

export type AppId = "ae" | "ppro" | "ame" | "au" | "ps" | "ai" | "lr";

/** `bundle` is matched against running executables, e.g. ".../Adobe After Effects 2026.app/Contents/MacOS/After Effects". */
export const APPS: Record<AppId, { name: string; bundle: RegExp }> = {
  ae: { name: "After Effects", bundle: /Adobe After Effects[^/]*\.app\// },
  ppro: { name: "Premiere Pro", bundle: /Adobe Premiere Pro[^/]*\.app\// },
  ame: { name: "Media Encoder", bundle: /Adobe Media Encoder[^/]*\.app\// },
  au: { name: "Audition", bundle: /Adobe Audition[^/]*\.app\// },
  ps: { name: "Photoshop", bundle: /Adobe Photoshop[^/]*\.app\// },
  ai: { name: "Illustrator", bundle: /Adobe Illustrator[^/]*\.app\// },
  lr: { name: "Lightroom Classic", bundle: /Adobe Lightroom[^/]*\.app\// },
};
export const ALL_APPS = Object.keys(APPS) as AppId[];
const MEDIA_CACHE_APPS: AppId[] = ["ppro", "ae", "ame", "au"];

export const GROUPS = [
  "Media Cache · Premiere, After Effects, Media Encoder, Audition",
  "After Effects",
  "Premiere Pro & Media Encoder",
  "Photoshop",
  "Lightroom",
  "Illustrator",
  "Audition",
  "Shared by all Adobe apps",
  "Creative Cloud & helpers",
  "Extra folders (from settings)",
] as const;
export type Group = (typeof GROUPS)[number];

const APP_GROUP: Record<AppId, Group> = {
  ae: "After Effects",
  ppro: "Premiere Pro & Media Encoder",
  ame: "Premiere Pro & Media Encoder",
  ps: "Photoshop",
  lr: "Lightroom",
  ai: "Illustrator",
  au: "Audition",
};

export interface CacheLocation {
  id: string;
  title: string;
  group: Group;
  /** Folder shown to the user (Show in Finder / Copy Path). Never deleted itself. */
  displayPath: string;
  /** Exact files/folders that get deleted. */
  targets: string[];
  /** Apps that must be closed for a safe purge. Empty = safe any time. */
  owners: AppId[];
  /** True when the folder came from Adobe's own preference files rather than a default path. */
  detected: boolean;
  /** Short hint shown as a tooltip. */
  note?: string;
}

export function prefs(): Preferences {
  return getPreferenceValues<Preferences>();
}

// ---------- small fs helpers ----------

async function isDir(p: string): Promise<boolean> {
  try {
    return (await fs.stat(p)).isDirectory();
  } catch {
    return false;
  }
}

async function entries(dir: string): Promise<Dirent[]> {
  try {
    return (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.name !== ".DS_Store");
  } catch {
    return [];
  }
}

/** Everything inside `dir` (the folder itself is kept, so apps don't complain it's missing). */
async function contentsOf(dir: string): Promise<string[]> {
  return (await entries(dir)).map((e) => path.join(dir, e.name));
}

async function subdirs(dir: string): Promise<string[]> {
  return (await entries(dir)).filter((e) => e.isDirectory()).map((e) => path.join(dir, e.name));
}

async function realPath(p: string): Promise<string> {
  try {
    return await fs.realpath(p);
  } catch {
    return path.resolve(p);
  }
}

export function expandHome(p: string): string {
  const t = p.trim();
  if (t === "~") return HOME;
  if (t.startsWith("~/")) return path.join(HOME, t.slice(2));
  return t;
}

export function tildify(p: string): string {
  return p === HOME || p.startsWith(HOME + path.sep) ? "~" + p.slice(HOME.length) : p;
}

function isInside(child: string, parent: string): boolean {
  return child.startsWith(parent.endsWith(path.sep) ? parent : parent + path.sep);
}

function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

// ---------- reading Adobe preferences ----------

async function plistString(file: string, keyPath: string): Promise<string | undefined> {
  try {
    const { stdout } = await run(PLUTIL, ["-extract", keyPath, "raw", "-o", "-", file]);
    const value = stdout.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

/** Media cache folders from every `com.Adobe.Common <version>.plist` (Premiere, AE, AME and Audition share them). */
async function mediaCacheFoldersFromPrefs(): Promise<string[]> {
  const plists = (await entries(PREFS))
    .filter((e) => /^com\.adobe\.common .+\.plist$/i.test(e.name))
    .map((e) => path.join(PREFS, e.name));
  const keys = ["Media Cache.FolderPath", "Media Cache.DatabasePath"];
  const values = await Promise.all(plists.flatMap((file) => keys.map((key) => plistString(file, key))));
  return unique(values.filter((v): v is string => !!v));
}

/**
 * After Effects writes Prefs.txt values as runs of "quoted text" and bare hex bytes,
 * e.g. "/Volumes/SSD/"D0"9F"..." — glue them back together as UTF-8.
 */
export function decodeAeValue(raw: string): string {
  const bytes: number[] = [];
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '"') {
      const end = raw.indexOf('"', i + 1);
      if (end < 0) break;
      bytes.push(...Buffer.from(raw.slice(i + 1, end), "utf8"));
      i = end + 1;
    } else {
      const hex = /^[0-9A-Fa-f]+/.exec(raw.slice(i));
      if (!hex) break;
      for (let j = 0; j + 1 < hex[0].length; j += 2) bytes.push(parseInt(hex[0].slice(j, j + 2), 16));
      i += hex[0].length;
    }
  }
  return Buffer.from(bytes).toString("utf8");
}

/** Disk Cache folders set in "Media & Disk Cache" preferences, across every installed After Effects version. */
export function parseAeDiskCacheFolders(prefsText: string): string[] {
  const start = prefsText.indexOf('["Disk Cache Controls"]');
  if (start < 0) return [];
  const rest = prefsText.slice(start + '["Disk Cache Controls"]'.length);
  const next = rest.indexOf('["');
  const section = next < 0 ? rest : rest.slice(0, next);
  const folders: string[] = [];
  for (const m of section.matchAll(/"Folder \d+"\s*=\s*((?:"[^"]*"|[0-9A-Fa-f]+)+)/g)) {
    const value = decodeAeValue(m[1]).trim();
    if (value) folders.push(value);
  }
  return folders;
}

async function aeDiskCacheFoldersFromPrefs(): Promise<string[]> {
  const files = (
    await Promise.all(
      (await subdirs(AE_PREFS_ROOT)).map(async (dir) =>
        (await entries(dir))
          .filter((e) => /^Adobe After Effects .+ Prefs\.txt$/.test(e.name))
          .map((e) => path.join(dir, e.name)),
      ),
    )
  ).flat();
  const parsed = await Promise.all(
    files.map(
      (f) => fs.readFile(f, "utf8").then(parseAeDiskCacheFolders, () => [] as string[]), // unreadable prefs file — skip it
    ),
  );
  return unique(parsed.flat());
}

/**
 * Newest installed bundle per app. Matched on the .app name in the path, so the yearly
 * folder names ("Adobe After Effects 2026") don't matter.
 */
export async function installedApps(): Promise<Partial<Record<AppId, string>>> {
  const apps = (await getApplications()).sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
  const result: Partial<Record<AppId, string>> = {};
  for (const id of ALL_APPS) {
    const matches = apps.filter((a) => APPS[id].bundle.test(`${a.path}/`));
    const pick = matches.find((a) => !/beta/i.test(a.name)) ?? matches[0];
    if (pick) result[id] = pick.path;
  }
  return result;
}

/** Paths Adobe's preference files point to that differ from the defaults (for the "Copy Detected Locations" action). */
export async function detectedCustomPaths(): Promise<string[]> {
  const defaults = new Set([await realPath(DEFAULT_COMMON), await realPath(CACHES)]);
  const all = [...(await mediaCacheFoldersFromPrefs()), ...(await aeDiskCacheFoldersFromPrefs())];
  const result: string[] = [];
  for (const p of all) {
    const rp = await realPath(p);
    if (!defaults.has(rp) && !isInside(rp, CACHES) && (await isDir(rp))) result.push(rp);
  }
  return unique(result);
}

// ---------- discovery ----------

const DISK_CACHE_RE = /(^|\s)disk cache( -|\.noindex|$)|disk cache.*\.noindex$/i;

async function aeDiskCaches(detect: boolean): Promise<CacheLocation[]> {
  const fromPrefs = detect ? await aeDiskCacheFoldersFromPrefs() : [];
  const parents = unique([
    ...fromPrefs,
    ...(await subdirs(AE_CACHES_ROOT)), // ~/Library/Caches/Adobe/After Effects/<version>
    ...(await subdirs(AE_PREFS_ROOT)), // stray Dynamic Link caches land next to the prefs
  ]);
  const prefSet = new Set(fromPrefs);
  const result: CacheLocation[] = [];
  const seen = new Set<string>();

  for (const parent of parents) {
    const candidates = DISK_CACHE_RE.test(path.basename(parent))
      ? [parent]
      : (await subdirs(parent)).filter((d) => DISK_CACHE_RE.test(path.basename(d)));
    for (const dir of candidates) {
      const rp = await realPath(dir);
      if (seen.has(rp)) continue;
      seen.add(rp);
      const version = /^\d+(\.\d+)*$/.test(path.basename(parent)) ? ` ${path.basename(parent)}` : "";
      result.push({
        id: `ae-disk:${rp}`,
        title: `Disk Cache${version}`,
        group: "After Effects",
        displayPath: dir,
        targets: await contentsOf(dir),
        owners: ["ae"],
        detected: prefSet.has(parent),
        note: "Rendered preview frames. After Effects rebuilds them as you work.",
      });
    }
  }
  return result;
}

async function mediaCaches(detect: boolean): Promise<CacheLocation[]> {
  const fromPrefs = detect ? await mediaCacheFoldersFromPrefs() : [];
  const defaultReal = await realPath(DEFAULT_COMMON);
  const bases = unique(await Promise.all([DEFAULT_COMMON, ...fromPrefs].map(realPath)));
  const result: CacheLocation[] = [];

  for (const base of bases) {
    const name = path.basename(base);
    const dirs = /^(Media Cache Files|Media Cache|Peak Files)$/i.test(name)
      ? [base]
      : ["Media Cache Files", "Media Cache", "Peak Files"].map((n) => path.join(base, n));
    for (const dir of dirs) {
      if (!(await isDir(dir))) continue;
      const label = path.basename(dir);
      const lightroom = /lightroom/i.test(dir);
      result.push({
        id: `media:${dir}`,
        title:
          label === "Media Cache"
            ? "Media Cache Database"
            : label === "Media Cache Files"
              ? "Media Cache Files"
              : "Peak Files (audio waveforms)",
        group: "Media Cache · Premiere, After Effects, Media Encoder, Audition",
        displayPath: dir,
        targets: await contentsOf(dir),
        owners: lightroom ? [...MEDIA_CACHE_APPS, "lr"] : MEDIA_CACHE_APPS,
        detected: base !== defaultReal,
        note: "Conformed audio, peak files and indexes. Rebuilt when you reopen projects.",
      });
    }
  }
  return result;
}

const CACHES_ADOBE_OWNERS: [RegExp, AppId[], Group][] = [
  [/^after effects/i, ["ae"], "After Effects"],
  [/^pproheadless/i, ["ame", "ppro"], "Premiere Pro & Media Encoder"],
  [/^premiere/i, ["ppro"], "Premiere Pro & Media Encoder"],
  [/media encoder/i, ["ame"], "Premiere Pro & Media Encoder"],
  [/^audition/i, ["au"], "Audition"],
  [/^photoshop/i, ["ps"], "Photoshop"],
  [/^illustrator/i, ["ai"], "Illustrator"],
  [/^lightroom/i, ["lr"], "Lightroom"],
  [/^(typesupport|fonts|typequest|color)$/i, ALL_APPS, "Shared by all Adobe apps"],
  [/^ccx welcome$/i, [], "Creative Cloud & helpers"],
];

/** One row per folder in ~/Library/Caches/Adobe. Loose files (e.g. machine-id files) are left alone. */
async function libraryCachesAdobe(): Promise<CacheLocation[]> {
  const root = path.join(CACHES, "Adobe");
  const result: CacheLocation[] = [];
  for (const dir of await subdirs(root)) {
    const name = path.basename(dir);
    const match = CACHES_ADOBE_OWNERS.find(([re]) => re.test(name));
    const owners = match ? match[1] : ALL_APPS;
    const group = match ? match[2] : "Shared by all Adobe apps";
    // Keep the per-version folders of After Effects so disk-cache rows stay separate.
    const targets = /^after effects$/i.test(name)
      ? (await Promise.all((await subdirs(dir)).map(contentsOf))).flat()
      : await contentsOf(dir);
    result.push({
      id: `caches-adobe:${dir}`,
      title: /^(typesupport|fonts|typequest)$/i.test(name) ? `Font cache (${name})` : name,
      group,
      displayPath: dir,
      targets,
      owners,
      detected: false,
    });
  }
  return result;
}

const BUNDLE_OWNERS: [RegExp, AppId][] = [
  [/aftereffects/i, "ae"],
  [/premierepro/i, "ppro"],
  [/\.ame\./i, "ame"],
  [/audition/i, "au"],
  [/photoshop/i, "ps"],
  [/illustrator/i, "ai"],
  [/lightroom/i, "lr"],
];

/** ~/Library/Caches/com.adobe.*, Camera Raw, CEP panels and the plugin installer. */
async function bundleCaches(): Promise<CacheLocation[]> {
  const perApp = new Map<AppId | "none", string[]>();
  const result: CacheLocation[] = [];

  for (const e of await entries(CACHES)) {
    if (!e.isDirectory()) continue;
    const dir = path.join(CACHES, e.name);
    if (/^com\.adobe\./i.test(e.name)) {
      const owner = BUNDLE_OWNERS.find(([re]) => re.test(e.name))?.[1] ?? "none";
      perApp.set(owner, [...(perApp.get(owner) ?? []), dir]);
    } else if (/^adobe camera raw/i.test(e.name)) {
      result.push({
        id: `bundle:${dir}`,
        title: `Camera Raw cache (${e.name})`,
        group: "Photoshop",
        displayPath: dir,
        targets: await contentsOf(dir),
        owners: ["ps", "lr"],
        detected: false,
      });
    } else if (e.name === "CSXS") {
      result.push({
        id: `bundle:${dir}`,
        title: "Extension panel cache (CSXS)",
        group: "Shared by all Adobe apps",
        displayPath: dir,
        targets: await contentsOf(dir),
        owners: ALL_APPS,
        detected: false,
      });
    } else if (/^adobe\.unifiedplugininstalleragent$/i.test(e.name)) {
      result.push({
        id: `bundle:${dir}`,
        title: "Plugin installer cache",
        group: "Creative Cloud & helpers",
        displayPath: dir,
        targets: await contentsOf(dir),
        owners: [],
        detected: false,
      });
    }
  }

  for (const [owner, dirs] of perApp) {
    result.push({
      id: `bundle-apps:${owner}`,
      title: owner === "none" ? "Creative Cloud app caches (com.adobe.*)" : "App cache (com.adobe.*)",
      group: owner === "none" ? "Creative Cloud & helpers" : APP_GROUP[owner],
      displayPath: dirs.length === 1 ? dirs[0] : CACHES,
      targets: (await Promise.all(dirs.map(contentsOf))).flat(),
      owners: owner === "none" ? [] : [owner],
      detected: false,
      note: dirs.map((d) => path.basename(d)).join(", "),
    });
  }
  return result;
}

/** Photoshop scratch files and Media Encoder's leftover preview folders in the user temp folder. */
async function tempFiles(): Promise<CacheLocation[]> {
  const tmp = os.tmpdir();
  const items = await entries(tmp);
  const psTemp = items.filter((e) => /^Photoshop Temp/i.test(e.name)).map((e) => path.join(tmp, e.name));
  const previews = items
    .filter((e) => e.isDirectory() && /^Adobe Premiere Pro (Audio|Video) Previews/i.test(e.name))
    .map((e) => path.join(tmp, e.name));
  const result: CacheLocation[] = [];
  if (psTemp.length)
    result.push({
      id: "tmp:photoshop",
      title: "Scratch files (Photoshop Temp)",
      group: "Photoshop",
      displayPath: tmp,
      targets: psTemp,
      owners: ["ps"],
      detected: false,
      note: "Photoshop's scratch disk. Left behind after crashes.",
    });
  if (previews.length)
    result.push({
      id: "tmp:ame-previews",
      title: "Leftover export previews",
      group: "Premiere Pro & Media Encoder",
      displayPath: tmp,
      targets: previews,
      owners: ["ame", "ppro"],
      detected: false,
      note: "Audio/Video Previews folders Media Encoder leaves behind after queued exports.",
    });
  return result;
}

/** Folders too broad to empty wholesale, even if someone types them into the settings. */
const TOO_BROAD = new Set(
  [
    "/",
    "/Users",
    "/Volumes",
    "/Applications",
    "/Library",
    "/System",
    HOME,
    LIBRARY,
    CACHES,
    PREFS,
    path.join(LIBRARY, "Application Support"),
    path.join(LIBRARY, "Application Support", "Adobe"),
    ...["Desktop", "Documents", "Downloads", "Movies", "Music", "Pictures", "Developer"].map((d) => path.join(HOME, d)),
  ].map((p) => path.resolve(p)),
);

export interface CustomFolderIssue {
  input: string;
  reason: string;
}

async function customFolders(raw: string): Promise<{ locations: CacheLocation[]; issues: CustomFolderIssue[] }> {
  const inputs = unique(
    raw
      .split(/[;\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
  const locations: CacheLocation[] = [];
  const issues: CustomFolderIssue[] = [];
  for (const input of inputs) {
    const dir = await realPath(expandHome(input));
    const depth = dir.split(path.sep).filter(Boolean).length;
    if (TOO_BROAD.has(dir) || (dir.startsWith("/Volumes/") ? depth < 3 : depth < 4)) {
      issues.push({ input, reason: "too broad to empty — point it at the cache folder itself" });
      continue;
    }
    if (!(await isDir(dir))) {
      issues.push({ input, reason: "folder not found" });
      continue;
    }
    locations.push({
      id: `custom:${dir}`,
      title: path.basename(dir),
      group: "Extra folders (from settings)",
      displayPath: dir,
      targets: await contentsOf(dir),
      owners: ALL_APPS,
      detected: false,
      note: "Added in the extension settings.",
    });
  }
  return { locations, issues };
}

export interface Discovery {
  locations: CacheLocation[];
  issues: CustomFolderIssue[];
}

/**
 * Finds every cache location. Each file is claimed by one row only:
 * more specific rows come first, and later rows drop anything overlapping them.
 */
export async function discoverLocations(): Promise<Discovery> {
  const { detectFromAdobePrefs, customFolders: raw } = prefs();
  const [disk, media, temp, adobeCaches, bundles, custom] = await Promise.all([
    aeDiskCaches(detectFromAdobePrefs),
    mediaCaches(detectFromAdobePrefs),
    tempFiles(),
    libraryCachesAdobe(),
    bundleCaches(),
    customFolders(raw ?? ""),
  ]);

  const claimed: string[] = [];
  const locations: CacheLocation[] = [];
  for (const loc of [...disk, ...media, ...temp, ...adobeCaches, ...bundles, ...custom.locations]) {
    const targets = loc.targets.filter(
      (t) => !claimed.some((c) => c === t || isInside(t, c) || isInside(c, t)) && !TOO_BROAD.has(path.resolve(t)),
    );
    claimed.push(...targets);
    if (targets.length) locations.push({ ...loc, targets });
  }
  return { locations, issues: custom.issues };
}
