import { runAppleScript } from "@raycast/utils";
import { readFile } from "fs/promises";
import { join } from "path";
import { getSpaces } from "./dia";
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

/** Profiles in Dia's sidebar order (Local State's order when Dia has no window), with their extensions. */
export async function getExtensionProfiles(): Promise<ExtensionProfile[]> {
  const [profiles, spaces] = await Promise.all([getProfiles(), getSpaces().catch(() => undefined)]);
  if (profiles.length === 0) throw new Error("No Dia profiles found. Open Dia at least once and try again.");
  const active = new Set(Object.values(spaces?.activeByWindow ?? {}));
  const position = (profile: Profile) => {
    const index = spaces?.names.indexOf(profile.name) ?? -1;
    return index === -1 ? Number.MAX_SAFE_INTEGER : index;
  };
  // Stable sort: profiles missing from Dia's list keep Local State's order
  profiles.sort((a, b) => position(a) - position(b));
  return Promise.all(
    profiles.map(async (profile): Promise<ExtensionProfile> => {
      const isActive = active.has(profile.name);
      try {
        return { ...profile, isActive, extensions: await readExtensions(profile) };
      } catch (error) {
        return { ...profile, isActive, extensions: [], error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
}

/** Opens a URL in a new tab of the profile; Dia switches the front window to that profile. */
export async function openURLInProfile(url: string, profileName: string) {
  await runAppleScript(
    `
    on run argv
      tell application "Dia"
        if (count of windows) is 0 then error "Open a Dia window and try again."
        make new tab at end of tabs of profile (item 2 of argv) of window 1 with properties {URL:(item 1 of argv)}
        activate
      end tell
    end run
  `,
    [url, profileName],
  );
}

/**
 * Switches the front Dia window to the profile and picks the extension from Dia's Extensions menu,
 * which opens it like its toolbar button. Needs Accessibility access. Returns false when no menu item matches.
 */
export async function clickExtensionMenuItem(extensionName: string, profileName: string): Promise<boolean> {
  const result = await runAppleScript(
    `
    on run argv
      tell application "Dia"
        if (count of windows) is 0 then error "Open a Dia window and try again."
        focus profile (item 2 of argv) of window 1
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
    [extensionName, profileName],
  );
  return result === "clicked";
}
