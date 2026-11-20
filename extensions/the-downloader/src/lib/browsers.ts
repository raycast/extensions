import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

export type PlatformPaths = { mac?: string; win?: string; linux?: string };

/** Pick the path key matching `platform`; returns "" if absent. */
function pickPath(paths: PlatformPaths, platform: NodeJS.Platform): string {
  if (platform === "darwin") return paths.mac ?? "";
  if (platform === "win32") return paths.win ?? "";
  return paths.linux ?? "";
}

type ResolveContext = { platform: NodeJS.Platform; home: string };
const defaultCtx = (): ResolveContext => ({ platform: process.platform, home: os.homedir() });

/**
 * Find the most-recently-used Firefox-format profile in the platform-appropriate
 * base directory. A profile qualifies only if its `cookies.sqlite` exists, so an
 * empty/never-launched profile doesn't shadow a real one. Returns "" if no
 * profile qualifies or the directory can't be read.
 */
export function findFirefoxProfile(paths: PlatformPaths, ctx: ResolveContext = defaultCtx()): string {
  const rel = pickPath(paths, ctx.platform);
  if (!rel) return "";
  const base = path.join(ctx.home, rel);
  let best: { full: string; mtime: number } | undefined;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(base, { withFileTypes: true });
  } catch {
    return "";
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(base, entry.name);
    try {
      if (!fs.existsSync(path.join(full, "cookies.sqlite"))) continue;
      const mtime = fs.statSync(full).mtimeMs;
      if (!best || mtime > best.mtime) best = { full, mtime };
    } catch {
      /* skip a profile we can't read or stat */
    }
  }
  return best?.full ?? "";
}

/**
 * Locate a Chromium-format browser's default profile. Returns `<base>/Default`
 * when its `Cookies` (older Chromium) or `Network/Cookies` (newer Chromium)
 * file exists; otherwise "".
 */
export function findChromiumProfile(paths: PlatformPaths, ctx: ResolveContext = defaultCtx()): string {
  const rel = pickPath(paths, ctx.platform);
  if (!rel) return "";
  const profile = path.join(ctx.home, rel, "Default");
  if (fs.existsSync(path.join(profile, "Cookies"))) return profile;
  if (fs.existsSync(path.join(profile, "Network", "Cookies"))) return profile;
  return "";
}

type Browser = {
  id: string;
  label: string;
  resolve(ctx: ResolveContext): string;
};

const capitalize = (s: string): string => (s.length === 0 ? s : s[0].toUpperCase() + s.slice(1));

const native = (id: string): Browser => ({
  id,
  label: capitalize(id),
  resolve: () => id,
});

const firefoxFork = (id: string, label: string, paths: PlatformPaths): Browser => ({
  id,
  label,
  resolve(ctx) {
    const p = findFirefoxProfile(paths, ctx);
    return p ? `firefox:${p}` : "";
  },
});

const chromiumFork = (id: string, label: string, paths: PlatformPaths): Browser => ({
  id,
  label,
  resolve(ctx) {
    const p = findChromiumProfile(paths, ctx);
    return p ? `chromium:${p}` : "";
  },
});

// Keep in sync with the `cookiesFromBrowser` dropdown in package.json.
export const BROWSERS: Browser[] = [
  native("chrome"),
  native("chromium"),
  native("firefox"),
  native("safari"),
  native("edge"),
  native("brave"),
  native("opera"),
  native("vivaldi"),
  native("librewolf"),
  firefoxFork("zen", "Zen", {
    win: "AppData/Roaming/zen/Profiles",
    mac: "Library/Application Support/zen/Profiles",
    linux: ".zen",
  }),
  firefoxFork("floorp", "Floorp", {
    win: "AppData/Roaming/Floorp/Profiles",
    mac: "Library/Application Support/Floorp/Profiles",
  }),
  chromiumFork("arc", "Arc", {
    win: "AppData/Local/Arc/User Data",
    mac: "Library/Application Support/Arc/User Data",
  }),
];

export type ResolvedBrowser = {
  spec: string;
  label: string;
  warning?: string;
};

/**
 * Translate the user's preference selection into the value gallery-dl wants,
 * plus a user-facing label and an optional warning when the selection isn't
 * usable. Callers short-circuit on `warning` with a Failure toast.
 */
export function resolveBrowser(id: string, customSpec?: string, ctx: ResolveContext = defaultCtx()): ResolvedBrowser {
  if (!id) return { spec: "", label: "" };

  if (id === "custom") {
    const spec = (customSpec ?? "").trim();
    return spec
      ? { spec, label: `Custom (${spec})` }
      : {
          spec: "",
          label: "Custom",
          warning: "Custom is selected but no Custom Browser Spec is set in preferences.",
        };
  }

  const entry = BROWSERS.find((b) => b.id === id);
  if (!entry) return { spec: id, label: id };

  const spec = entry.resolve(ctx);
  if (spec) return { spec, label: entry.label };
  return {
    spec: "",
    label: entry.label,
    warning: `No ${entry.label} profile with cookies was found. Make sure ${entry.label} is installed and has been opened at least once, or use a Custom Browser Spec.`,
  };
}
