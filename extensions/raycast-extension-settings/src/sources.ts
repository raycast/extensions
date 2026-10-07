import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type ExtensionKind = "built-in" | "store" | "dev";

export type ExtensionRow = {
  title: string;
  /** Install folder name; installed extensions only. */
  id?: string;
  kind: ExtensionKind;
  owner?: string;
  author?: string;
  name?: string;
  icon?: RowIcon;
};

// A row's icon in Raycast's own image shapes: an image file (optionally one per theme) or an app's icon.
export type RowIcon = { source: string | { light: string; dark: string } } | { fileIcon: string };

// Raycast installs Store extensions into folders named by a UUID; `ray develop` uses the
// extension's own name, so a non-UUID folder is a development extension.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const INSTALLED_DIR = join(homedir(), ".config/raycast/extensions");
export const RAYCAST_APP = "/Applications/Raycast.app";
const RAYCAST_RESOURCES = join(RAYCAST_APP, "Contents/Resources/macos-app_RaycastDesktopApp.bundle/Contents/Resources");
export const RAYCAST_BACKEND = join(RAYCAST_RESOURCES, "backend/index.mjs");
export const RAYCAST_FRONTEND = join(RAYCAST_RESOURCES, "frontend");

// Built-in extension keys Raycast defines but never shows as a row in Settings.
const HIDDEN_BUILT_INS = new Set([
  "games",
  "raycast-account",
  "raycast-debug",
  "raycast-wrapped",
  "trial-nudges",
  "urls",
  "web-searches",
  "windows-run",
  "windows-taskbar",
]);

// Built-in extensions live only inside the Raycast app, declared as `({key:`…`,title:`…`` in its
// backend bundle; the minified function name changes between versions, so match on the shape.
export function parseBuiltIns(
  bundle: string,
  icons: Map<string, string> = new Map(),
  iconDir: string = RAYCAST_FRONTEND,
): ExtensionRow[] {
  const rows = new Map<string, ExtensionRow>();
  for (const m of bundle.matchAll(/\(\{key:`([a-z-]+)`,title:`([^`]+)`/g)) {
    const [, key, title] = m;
    if (HIDDEN_BUILT_INS.has(key) || rows.has(key)) continue;
    rows.set(key, {
      title,
      kind: "built-in",
      owner: "Raycast",
      author: "Raycast",
      icon: builtInIcon(key, icons, iconDir),
    });
  }
  return [...rows.values()];
}

// Raycast's frontend folder holds its icons as `<stem>[_large]-<8-character hash>.png`. The hash
// changes every release and can itself contain `-` or `_`, so it is matched from the end.
const ICON_FILE = /^(.+?)(_large)?-[A-Za-z0-9_-]{8}\.png$/;

// Icon file name for each stem, preferring the large variant.
export function indexIcons(files: string[]): Map<string, string> {
  const byStem = new Map<string, string>();
  for (const f of files) {
    const m = ICON_FILE.exec(f);
    if (m && (m[2] || !byStem.has(m[1]))) byStem.set(m[1], f);
  }
  return byStem;
}

// Built-ins whose icon file carries a different name than their key.
const ICON_RENAMES: Record<string, string> = {
  applications: "extension-applications-mac",
  navigation: "extension-navigation-mac",
  "script-commands": "extension-script",
  system: "extension-raycast-system",
};

// Built-ins with no icon of their own borrow one of their commands' icons; a stem may come as a
// `-light` / `-dark` pair.
const COMMAND_ICONS: Record<string, string> = {
  ai: "command-ai",
  organizations: "command-settings-organizations",
  "raycast-settings": "command-general",
  "screen-awareness": "command-ai-extension-screen-awareness-mac",
};

// Built-ins that wrap a macOS app show that app's icon.
const APP_ICONS: Record<string, string> = { "apple-shortcuts": "/System/Applications/Shortcuts.app" };

// First that exists: the built-in's own icon, its renamed icon, a command's icon, the wrapped
// app's icon, then Raycast's app icon.
export function builtInIcon(key: string, icons: Map<string, string>, iconDir: string = RAYCAST_FRONTEND): RowIcon {
  const file = (stem?: string) => {
    const name = stem && icons.get(stem);
    return name ? join(iconDir, name) : undefined;
  };
  const own = file(`extension-${key}`) ?? file(ICON_RENAMES[key]);
  if (own) return { source: own };
  const command = COMMAND_ICONS[key];
  if (command) {
    const light = file(`${command}-light`);
    const dark = file(`${command}-dark`);
    if (light && dark) return { source: { light, dark } };
    const single = file(command) ?? light ?? dark;
    if (single) return { source: single };
  }
  const app = APP_ICONS[key];
  return { fileIcon: app && existsSync(app) ? app : RAYCAST_APP };
}

// Raycast V2 unpacks Store installs and updates with adm-zip, which writes every file mode 0666.
// Moving from V1 copied all V1 folders across, uninstalled ones included, with their 0644 files,
// and V2 never touches a folder it doesn't know. So a world-writable manifest marks a live install.
export function installedByRaycast(manifest: string): boolean {
  return (statSync(manifest).mode & 0o002) !== 0;
}

// Store and dev extensions: one folder per extension, each with its package.json manifest.
export function readInstalled(dir: string = INSTALLED_DIR): ExtensionRow[] {
  if (!existsSync(dir)) return [];
  const rows: ExtensionRow[] = [];
  for (const id of readdirSync(dir)) {
    const manifest = join(dir, id, "package.json");
    if (!existsSync(manifest)) continue;
    try {
      if (UUID.test(id) && !installedByRaycast(manifest)) continue;
      const pkg = JSON.parse(readFileSync(manifest, "utf8"));
      if (!pkg.title) continue;
      const icon = pkg.icon ? join(dir, id, "assets", pkg.icon) : undefined;
      rows.push({
        title: pkg.title,
        id,
        kind: UUID.test(id) ? "store" : "dev",
        owner: pkg.owner ?? pkg.author,
        author: pkg.author,
        name: pkg.name,
        icon: icon && existsSync(icon) ? { source: icon } : undefined,
      });
    } catch {
      // unreadable or vanished manifest (mid-update): skip the row rather than fail the list
    }
  }
  return rows;
}

// One list sorted A–Z. A built-in sharing an installed extension's title is dropped; installed
// extensions are all kept, even when two share a title.
export function mergeRows(builtIns: ExtensionRow[], installed: ExtensionRow[]): ExtensionRow[] {
  const installedTitles = new Set(installed.map((r) => r.title.toLowerCase()));
  return [...builtIns.filter((r) => !installedTitles.has(r.title.toLowerCase())), ...installed].sort((a, b) =>
    a.title.localeCompare(b.title),
  );
}

// Stable identity for a row (list key and ranking): the install folder for installed extensions,
// the title for built-ins, so rows stay distinct even when titles match.
export function rowKey(row: ExtensionRow): string {
  return `${row.kind}:${row.id ?? row.title}`;
}

// Lowercased titles shared by more than one row. Settings search can't tell those rows apart.
export function sharedTitles(rows: ExtensionRow[]): Set<string> {
  const seen = new Set<string>();
  const shared = new Set<string>();
  for (const r of rows) {
    const t = r.title.toLowerCase();
    if (seen.has(t)) shared.add(t);
    seen.add(t);
  }
  return shared;
}

// The subset of Raycast's `Cache` used here, so tests can pass a plain Map-backed stand-in.
export type TextCache = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
};

// Versioned so rows cached before built-ins had icons are rebuilt.
const BUILT_INS_KEY = "built-ins-v2";

// Parsing the 7.6 MB backend bundle is the slow part of opening the list, so keep the parsed
// titles and icons until Raycast updates (new version or a rewritten bundle).
export function loadBuiltIns(
  cache: TextCache,
  raycastVersion: string,
  bundlePath: string = RAYCAST_BACKEND,
  iconDir: string = RAYCAST_FRONTEND,
): ExtensionRow[] {
  if (!existsSync(bundlePath)) return [];
  const stamp = `${raycastVersion}:${statSync(bundlePath).mtimeMs}`;
  try {
    const cached = JSON.parse(cache.get(BUILT_INS_KEY) ?? "null");
    if (cached?.stamp === stamp) return cached.rows as ExtensionRow[];
  } catch {
    // corrupt entry: rebuild it below
  }
  const icons = indexIcons(existsSync(iconDir) ? readdirSync(iconDir) : []);
  const rows = parseBuiltIns(readFileSync(bundlePath, "utf8"), icons, iconDir);
  cache.set(BUILT_INS_KEY, JSON.stringify({ stamp, rows }));
  return rows;
}

export function loadRows(showDevelopment: boolean, cache: TextCache, raycastVersion: string): ExtensionRow[] {
  const installed = readInstalled().filter((r) => showDevelopment || r.kind !== "dev");
  return mergeRows(loadBuiltIns(cache, raycastVersion), installed);
}
