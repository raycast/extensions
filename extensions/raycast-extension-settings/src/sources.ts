import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type ExtensionKind = "built-in" | "store" | "dev";

export type ExtensionRow = {
  title: string;
  kind: ExtensionKind;
  owner?: string;
  author?: string;
  name?: string;
  icon?: string;
};

// Raycast installs Store extensions into folders named by a UUID; `ray develop` uses the
// extension's own name, so a non-UUID folder is a development extension.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const INSTALLED_DIR = join(homedir(), ".config/raycast/extensions");
export const RAYCAST_BACKEND =
  "/Applications/Raycast.app/Contents/Resources/macos-app_RaycastDesktopApp.bundle/Contents/Resources/backend/index.mjs";

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
export function parseBuiltIns(bundle: string): ExtensionRow[] {
  const rows = new Map<string, ExtensionRow>();
  for (const m of bundle.matchAll(/\(\{key:`([a-z-]+)`,title:`([^`]+)`/g)) {
    const [, key, title] = m;
    if (HIDDEN_BUILT_INS.has(key) || rows.has(key)) continue;
    rows.set(key, { title, kind: "built-in", owner: "Raycast", author: "Raycast" });
  }
  return [...rows.values()];
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
        kind: UUID.test(id) ? "store" : "dev",
        owner: pkg.owner ?? pkg.author,
        author: pkg.author,
        name: pkg.name,
        icon: icon && existsSync(icon) ? icon : undefined,
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

// Stable identity for a row (list key and ranking), distinct even when titles match.
export function rowKey(row: ExtensionRow): string {
  return `${row.kind}:${row.owner ?? ""}/${row.name ?? row.title}`;
}

// The subset of Raycast's `Cache` used here, so tests can pass a plain Map-backed stand-in.
export type TextCache = {
  get(key: string): string | undefined;
  set(key: string, value: string): void;
};

const BUILT_INS_KEY = "built-ins";

// Parsing the 7.6 MB backend bundle is the slow part of opening the list, so keep the parsed
// titles until Raycast updates (new version or a rewritten bundle).
export function loadBuiltIns(
  cache: TextCache,
  raycastVersion: string,
  bundlePath: string = RAYCAST_BACKEND,
): ExtensionRow[] {
  if (!existsSync(bundlePath)) return [];
  const stamp = `${raycastVersion}:${statSync(bundlePath).mtimeMs}`;
  try {
    const cached = JSON.parse(cache.get(BUILT_INS_KEY) ?? "null");
    if (cached?.stamp === stamp) return cached.rows as ExtensionRow[];
  } catch {
    // corrupt entry: rebuild it below
  }
  const rows = parseBuiltIns(readFileSync(bundlePath, "utf8"));
  cache.set(BUILT_INS_KEY, JSON.stringify({ stamp, rows }));
  return rows;
}

export function loadRows(showDevelopment: boolean, cache: TextCache, raycastVersion: string): ExtensionRow[] {
  const installed = readInstalled().filter((r) => showDevelopment || r.kind !== "dev");
  return mergeRows(loadBuiltIns(cache, raycastVersion), installed);
}
