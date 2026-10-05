import { Cache, environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";

export interface CometProfile {
  /** Directory name inside the user data dir, e.g. "Default" or "Profile 2". */
  directory: string;
  /** Display name chosen in Comet. */
  name: string;
  /** Hex color derived from the profile's theme, e.g. "#4b7c79". */
  color?: string;
  /** Absolute path to a custom avatar image, if the profile has one. */
  avatarPath?: string;
  /** Whether this was the most recently used profile. */
  lastUsed: boolean;
  /** Whether this profile currently has an open window (per Comet's own bookkeeping). */
  active: boolean;
}

interface LocalStateProfileEntry {
  name?: string;
  profile_color_seed?: number;
  default_avatar_stroke_color?: number;
  profile_highlight_color?: number;
  use_gaia_picture?: boolean;
  is_using_default_avatar?: boolean;
}

interface LocalState {
  profile?: {
    info_cache?: Record<string, LocalStateProfileEntry>;
    profiles_order?: string[];
    last_used?: string;
    last_active_profiles?: string[];
  };
}

const DEFAULT_APP_PATH = "/Applications/Comet.app";
const DEFAULT_USER_DATA_DIR = join(homedir(), "Library", "Application Support", "Comet");
const CACHE_KEY = "profiles-v1";

const cache = new Cache({ capacity: 64 * 1024 });

function expandHome(p: string): string {
  return p.startsWith("~") ? join(homedir(), p.slice(1)) : p;
}

export function getUserDataDir(): string {
  const { userDataDir } = getPreferenceValues<ExtensionPreferences>();
  const dir = userDataDir?.trim();
  return dir ? expandHome(dir) : DEFAULT_USER_DATA_DIR;
}

export function getAppPath(): string {
  const { cometApp } = getPreferenceValues<ExtensionPreferences>();
  if (cometApp?.path && existsSync(cometApp.path)) return cometApp.path;
  return DEFAULT_APP_PATH;
}

export function alwaysNewWindow(): boolean {
  return getPreferenceValues<ExtensionPreferences>().alwaysNewWindow === true;
}

export function isCometInstalled(): boolean {
  return existsSync(getAppPath());
}

/** Chromium stores colors as signed 32-bit ARGB integers. */
function argbToHex(n: number | undefined): string | undefined {
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return "#" + ((n >>> 0) & 0xffffff).toString(16).padStart(6, "0");
}

function parseProfiles(localStatePath: string, userDataDir: string): CometProfile[] {
  const state = JSON.parse(readFileSync(localStatePath, "utf8")) as LocalState;
  const info = state.profile?.info_cache ?? {};
  const lastUsed = state.profile?.last_used;
  const active = new Set(state.profile?.last_active_profiles ?? []);
  const ordered = state.profile?.profiles_order?.filter((d) => d in info) ?? [];
  const rest = Object.keys(info).filter((d) => !ordered.includes(d));

  return [...ordered, ...rest].map((directory) => {
    const entry = info[directory] ?? {};
    const picture = join(userDataDir, directory, "Google Profile Picture.png");
    const hasPicture = (entry.use_gaia_picture || entry.is_using_default_avatar === false) && existsSync(picture);
    return {
      directory,
      name: entry.name?.trim() || directory,
      color:
        argbToHex(entry.default_avatar_stroke_color) ??
        argbToHex(entry.profile_color_seed) ??
        argbToHex(entry.profile_highlight_color),
      avatarPath: hasPicture ? picture : undefined,
      lastUsed: directory === lastUsed,
      active: active.has(directory),
    };
  });
}

/**
 * Reads Comet's profile registry ("Local State"). The file is ~1 MB, so the parsed
 * result is cached and only re-read when the file's mtime/size changes.
 */
export function getProfiles(): CometProfile[] {
  const userDataDir = getUserDataDir();
  const localStatePath = join(userDataDir, "Local State");
  let stamp: string;
  try {
    const st = statSync(localStatePath);
    stamp = `${localStatePath}|${st.mtimeMs}|${st.size}`;
  } catch {
    return [];
  }

  const cached = cache.get(CACHE_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { stamp: string; profiles: CometProfile[] };
      if (parsed.stamp === stamp) return parsed.profiles;
    } catch {
      // fall through and re-read
    }
  }

  try {
    const profiles = parseProfiles(localStatePath, userDataDir);
    cache.set(CACHE_KEY, JSON.stringify({ stamp, profiles }));
    return profiles;
  } catch {
    return [];
  }
}

/** App display name as it appears in window titles and the process list, e.g. "Comet". */
function getAppName(): string {
  return basename(getAppPath()).replace(/\.app$/, "");
}

export type FocusResult = "focused" | "none" | "not-running";

// Chromium appends " - <App> - <Profile>" to window titles once more than one profile exists.
// This raises the first window whose title carries the wanted profile and returns "focused".
const FOCUS_SCRIPT = `on run argv
  set appName to item 1 of argv
  set suffix to item 2 of argv
  tell application "System Events"
    if not (exists process appName) then return "not-running"
    tell process appName
      repeat with w in windows
        if suffix is "" or (name of w ends with suffix) then
          try
            if value of attribute "AXMinimized" of w is true then set value of attribute "AXMinimized" of w to false
          end try
          perform action "AXRaise" of w
          set frontmost to true
          return "focused"
        end if
      end repeat
    end tell
  end tell
  return "none"
end run`;

/**
 * Brings an already-open window of this profile to the front, if there is one.
 * Requires Raycast to have Accessibility access; rejects with the osascript error otherwise.
 */
export function focusProfileWindow(profile: CometProfile, profileCount: number): Promise<FocusResult> {
  const appName = getAppName();
  // With a single profile Chromium omits the profile suffix, so any window will do.
  const suffix = profileCount > 1 ? ` - ${appName} - ${profile.name}` : "";
  return new Promise((resolve, reject) => {
    execFile(
      "/usr/bin/osascript",
      ["-e", FOCUS_SCRIPT, appName, suffix],
      { timeout: 5_000 },
      (error, stdout, stderr) => {
        if (error) reject(new Error(stderr?.trim() || error.message));
        else resolve(stdout.trim() as FocusResult);
      },
    );
  });
}

export function isAccessibilityError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /assistive access|-25211|-1719|not allowed/i.test(msg);
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Resolve user input to a profile. Matches, in order: exact name, exact directory,
 * name prefix, name/directory substring. Case-insensitive.
 */
export function findProfile(query: string, profiles: CometProfile[]): CometProfile | undefined {
  const q = normalize(query);
  if (!q) return undefined;
  return (
    profiles.find((p) => normalize(p.name) === q) ??
    profiles.find((p) => normalize(p.directory) === q) ??
    profiles.find((p) => normalize(p.name).startsWith(q)) ??
    profiles.find((p) => normalize(p.name).includes(q) || normalize(p.directory).includes(q))
  );
}

export interface LaunchOptions {
  url?: string;
  newWindow?: boolean;
}

function normalizeUrl(raw: string | undefined): string | undefined {
  const u = raw?.trim();
  if (!u) return undefined;
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u; // already has a scheme (https:, chrome:, file:, …)
  return `https://${u}`;
}

/**
 * Launches Comet for the given profile. Uses `open -n` so macOS always spawns a fresh
 * launcher process; Chromium's singleton then hands the request to the running instance
 * (or becomes it) and opens a window for that profile. Nothing stays attached to Raycast.
 * Note: a running Chromium always opens a *new* window for a bare --profile-directory,
 * so callers wanting to reuse a window call focusProfileWindow() first.
 */
export function launchProfile(profile: CometProfile, options: LaunchOptions = {}): Promise<void> {
  const args = ["-na", getAppPath(), "--args", `--profile-directory=${profile.directory}`];
  if (options.newWindow) args.push("--new-window");
  const url = normalizeUrl(options.url);
  if (url) args.push(url);

  return new Promise((resolve, reject) => {
    execFile("/usr/bin/open", args, { timeout: 15_000 }, (error, _stdout, stderr) => {
      if (error) reject(new Error(stderr?.trim() || error.message));
      else resolve();
    });
  });
}

/** Deeplink to one of this extension's commands. */
export function commandDeeplink(command: string): string {
  return `raycast://extensions/${environment.ownerOrAuthorName}/${environment.extensionName}/${command}`;
}

/** Launch context accepted by the "Switch Comet Profile" command to open a profile straight away. */
export interface ProfileLaunchContext {
  profile?: string;
}

/**
 * Deeplink that opens this profile via the "Switch Comet Profile" command's launch context.
 * Usable from Quicklinks, Shortcuts.app, a terminal, etc.
 */
export function profileDeeplink(profile: CometProfile): string {
  const context: ProfileLaunchContext = { profile: profile.directory };
  return `${commandDeeplink("switch-profile")}?context=${encodeURIComponent(JSON.stringify(context))}`;
}
