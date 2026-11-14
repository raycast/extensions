import { runAppleScript } from "@raycast/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSpaces, type Spaces } from "./dia";
import { getProfiles, readJSON, type Profile } from "./profiles";

/** Chromium `Manifest::Location` values for extensions bundled with the browser. */
const COMPONENT_LOCATIONS = new Set([5, 10]);

export type BrowserExtension = {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  enabled: boolean;
  builtIn: boolean;
  pinned: boolean;
  popupUrl?: string;
};

export type ExtensionProfile = Profile & {
  /**
   * The Dia space whose name this Chromium profile has, or undefined when the profile is shared by all spaces.
   * Only a current space name is ever passed to AppleScript, never a stale Chromium profile name.
   */
  space?: string;
  /** Whether a window shows the profile's space. Always false for a shared profile. */
  isActive: boolean;
  extensions: BrowserExtension[];
  /** Why the profile's extension settings couldn't be read. */
  error?: string;
};

type Manifest = {
  name?: string;
  description?: string;
  default_locale?: string;
  theme?: unknown;
  icons?: Record<string, string>;
  action?: { default_popup?: string };
  browser_action?: { default_popup?: string };
};

type ExtensionSettings = {
  path?: string;
  location?: number;
  state?: number;
  disable_reasons?: number | number[];
  manifest?: Manifest;
};

type ExtensionPreferences = {
  extensions?: { settings?: Record<string, ExtensionSettings>; pinned_extensions?: string[] };
};

/** Reads a JSON file; a missing file is undefined, any other read or parse error throws. */
async function readOptionalJSON<T>(path: string): Promise<T | undefined> {
  try {
    return JSON.parse((await readFile(path, "utf-8")).replace(/^\uFEFF/, "")) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}

/** Replaces `__MSG_key__` placeholders (keys are case-insensitive) from the default locale; unknown keys stay as is. */
async function localize(value: string | undefined, manifest: Manifest, extensionPath: string) {
  if (!value?.includes("__MSG_")) return value;
  const messages = await readJSON<Record<string, { message?: string }>>(
    join(extensionPath, "_locales", manifest.default_locale ?? "en", "messages.json"),
  );
  const byKey = new Map(Object.entries(messages ?? {}).map(([key, entry]) => [key.toLowerCase(), entry.message]));
  return value.replace(/__MSG_([\w@]+?)__/g, (match, key: string) => byKey.get(key.toLowerCase()) ?? match);
}

async function readExtension(
  id: string,
  settings: ExtensionSettings,
  profile: Profile,
  pinned: string[],
): Promise<BrowserExtension | undefined> {
  if (!settings.path) return undefined;
  const path = settings.path.startsWith("/") ? settings.path : join(profile.path, "Extensions", settings.path);
  const manifest = settings.manifest ?? (await readJSON<Manifest>(join(path, "manifest.json")));
  if (!manifest || manifest.theme) return undefined;

  const largestIcon = Object.entries(manifest.icons ?? {}).sort(([a], [b]) => Number(b) - Number(a))[0]?.[1];
  const popup = (manifest.action ?? manifest.browser_action)?.default_popup;
  const reasons = settings.disable_reasons;
  return {
    id,
    name: (await localize(manifest.name, manifest, path)) ?? id,
    description: await localize(manifest.description, manifest, path),
    icon: largestIcon ? join(path, largestIcon) : undefined,
    enabled: settings.state !== 0 && !(Array.isArray(reasons) ? reasons.length : reasons),
    builtIn: COMPONENT_LOCATIONS.has(settings.location ?? -1),
    pinned: pinned.includes(id),
    popupUrl: popup ? `chrome-extension://${id}/${popup.replace(/^\//, "")}` : undefined,
  };
}

async function readExtensions(profile: Profile): Promise<BrowserExtension[]> {
  const [preferences, securePreferences] = await Promise.all([
    readOptionalJSON<ExtensionPreferences>(join(profile.path, "Preferences")),
    readOptionalJSON<ExtensionPreferences>(join(profile.path, "Secure Preferences")),
  ]);
  // Which file holds extension settings varies between builds, so merge both
  const settings = { ...preferences?.extensions?.settings, ...securePreferences?.extensions?.settings };
  const pinned = preferences?.extensions?.pinned_extensions ?? [];
  const extensions = await Promise.all(
    Object.entries(settings).map(([id, entry]) => readExtension(id, entry, profile, pinned)),
  );
  return extensions
    .filter((extension): extension is BrowserExtension => Boolean(extension))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Links each Chromium profile to a Dia space.
 *
 * Dia's spaces (AppleScript calls them "profiles") are not Chromium profiles. Dia keeps its spaces in its own
 * data, and one Chromium profile can back several spaces or all of them. For example, a setup with the spaces
 * Personal and Work can have a single `Default` profile, and the name in Local State's `info_cache` can be
 * the name of a space that was deleted long ago.
 * A single profile is shared by all spaces, even when its name matches a current space. With several profiles,
 * a profile is linked to a space when its name matches a current space; otherwise it is shared by all spaces.
 * When Dia has no window, the spaces are unknown: several profiles keep their names.
 */
function spaceOf(profile: Profile, profiles: Profile[], spaces: Spaces | undefined): string | undefined {
  if (profiles.length === 1) return undefined;
  if (spaces?.names.length) return spaces.names.includes(profile.name) ? profile.name : undefined;
  return profiles.length > 1 ? profile.name : undefined;
}

/** Display name of a profile's space, such as "Work" or "All Spaces". */
export const spaceLabel = (profile: ExtensionProfile) => profile.space ?? "All Spaces";

/**
 * Chromium profiles with their extensions and the Dia space each belongs to, in Dia's sidebar order
 * (shared profiles first, then Local State's order for spaces Dia didn't list), plus Dia's spaces
 * (undefined when they couldn't be read).
 */
export async function loadExtensionProfiles(): Promise<{
  profiles: ExtensionProfile[];
  spaces: Spaces | undefined;
}> {
  const [profiles, spaces] = await Promise.all([getProfiles(), getSpaces().catch(() => undefined)]);
  if (profiles.length === 0) throw new Error("No Dia profiles found. Open Dia at least once and try again.");
  const active = new Set(Object.values(spaces?.activeByWindow ?? {}));
  const withSpaces = profiles.map((profile) => ({ profile, space: spaceOf(profile, profiles, spaces) }));
  const position = (space: string | undefined) => {
    if (!space) return -1;
    const index = spaces?.names.indexOf(space) ?? -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  // Stable sort: profiles missing from Dia's list keep Local State's order
  withSpaces.sort((a, b) => position(a.space) - position(b.space));
  const extensionProfiles = await Promise.all(
    withSpaces.map(async ({ profile, space }): Promise<ExtensionProfile> => {
      const isActive = space ? active.has(space) : false;
      try {
        return { ...profile, space, isActive, extensions: await readExtensions(profile) };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ...profile, space, isActive, extensions: [], error: message };
      }
    }),
  );
  return { profiles: extensionProfiles, spaces };
}

export async function getExtensionProfiles(): Promise<ExtensionProfile[]> {
  return (await loadExtensionProfiles()).profiles;
}

/**
 * Opens a URL in a new tab of a Dia space, which Dia switches the front window to.
 * Without a space, the tab opens in the front window's current space.
 */
export async function openURLInSpace(url: string, space: string | undefined) {
  await runAppleScript(
    `
    on run argv
      tell application "Dia"
        if (count of windows) is 0 then error "Open a Dia window and try again."
        set _space to item 2 of argv
        if _space is "" then set _space to name of active profile of window 1
        make new tab at end of tabs of profile _space of window 1 with properties {URL:(item 1 of argv)}
        activate
      end tell
    end run
  `,
    [url, space ?? ""],
  );
}

/**
 * Picks the extension from Dia's Extensions menu, which opens it like its toolbar button. With a space, the front
 * Dia window switches to it first; without one, it stays in its current space. Needs Accessibility access.
 * Returns false when no menu item matches.
 */
export async function clickExtensionMenuItem(extensionName: string, space: string | undefined): Promise<boolean> {
  const result = await runAppleScript(
    `
    on run argv
      tell application "Dia"
        if (count of windows) is 0 then error "Open a Dia window and try again."
        if (item 2 of argv) is not "" then focus profile (item 2 of argv) of window 1
        activate
      end tell
      delay 0.3
      tell application "System Events" to tell process "Dia"
        set _menu to menu bar item "Extensions" of menu bar 1
        click _menu
        delay 0.2
        repeat with _item in menu items of menu 1 of _menu
          if name of _item is (item 1 of argv) then
            click _item
            return "clicked"
          end if
        end repeat
        key code 53
      end tell
      return "missing"
    end run
  `,
    [extensionName, space ?? ""],
  );
  return result === "clicked";
}

/** Dia's extension settings page for an extension. */
export const extensionSettingsUrl = (extension: BrowserExtension) => `chrome://extensions/?id=${extension.id}`;

/** Whether an error comes from Raycast missing Accessibility access, which clicking Dia's menus needs. */
export function needsAccessibility(error: unknown): boolean {
  return /assistive access|-1719|-25211/.test(String(error));
}

/**
 * Picks the extension from Dia's Extensions menu, else opens its popup, else its settings page, in a tab.
 * With a space, the front window switches to it first; without one, it opens in the current space.
 * Returns how it was opened.
 */
export async function openExtension(
  extension: BrowserExtension,
  space: string | undefined,
): Promise<"menu" | "popup" | "settings"> {
  if (await clickExtensionMenuItem(extension.name, space)) return "menu";
  await openURLInSpace(extension.popupUrl ?? extensionSettingsUrl(extension), space);
  return extension.popupUrl ? "popup" : "settings";
}
