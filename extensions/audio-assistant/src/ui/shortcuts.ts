import type { Keyboard } from "@raycast/api";

function readPreferences(): Record<string, string | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raycast = require("@raycast/api") as { getPreferenceValues?: () => Record<string, string | undefined> };
    return raycast.getPreferenceValues ? raycast.getPreferenceValues() : {};
  } catch {
    return {};
  }
}

export interface ShortcutDefinition {
  mod1: string;
  mod2: string;
  key: string;
}

export const DEFAULT_SHORTCUT_CONFIG: Record<string, ShortcutDefinition> = {
  playPause: { mod1: "alt", mod2: "enter", key: "na" },
  next: { mod1: "alt", mod2: ".", key: "na" },
  previous: { mod1: "alt", mod2: ",", key: "na" },
  playNext: { mod1: "ctrl", mod2: "alt", key: "n" },
  addToQueue: { mod1: "alt", mod2: "a", key: "na" },
  browseArtist: { mod1: "ctrl", mod2: "space", key: "na" },
  browseAlbum: { mod1: "ctrl", mod2: "shift", key: "space" },
  mute: { mod1: "alt", mod2: "m", key: "na" },
  volumeUp: { mod1: "alt", mod2: "=", key: "na" },
  volumeDown: { mod1: "alt", mod2: "-", key: "na" },
  queue: { mod1: "alt", mod2: "q", key: "na" },
  shuffle: { mod1: "alt", mod2: "s", key: "na" },
  repeat: { mod1: "alt", mod2: "r", key: "na" },
  refresh: { mod1: "ctrl", mod2: "r", key: "na" },
};

let forcedDefaults = false;

export function resetForcedDefaults(): void {
  forcedDefaults = false;
}

export async function restoreDefaultShortcuts(): Promise<void> {
  forcedDefaults = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const raycast = require("@raycast/api") as {
      LocalStorage?: { removeItem: (k: string) => Promise<void> };
      showToast?: (opts: { style: unknown; title: string }) => Promise<void>;
      Toast?: { Style: { Success: unknown } };
    };
    if (raycast.LocalStorage) {
      await raycast.LocalStorage.removeItem("shortcut-overrides:stored");
    }
    if (raycast.showToast && raycast.Toast) {
      await raycast.showToast({
        style: raycast.Toast.Style.Success,
        title: "Shortcuts restored to defaults",
      });
    }
  } catch {
    // ignore
  }
}

function mapModifier(mod: string, platform: "macOS" | "Windows"): Keyboard.KeyModifier {
  if (mod === "alt") return platform === "macOS" ? "opt" : "alt";
  if (mod === "ctrl") return platform === "macOS" ? "cmd" : "ctrl";
  if (mod === "physical_ctrl") return "ctrl";
  if (mod === "shift") return "shift";
  return platform === "macOS" ? "cmd" : "ctrl";
}

export function buildShortcut(def: ShortcutDefinition): Keyboard.Shortcut {
  const is2Key = !def.key || def.key === "na";
  const keyEquivalent = (is2Key ? def.mod2 : def.key) as Keyboard.KeyEquivalent;

  // Guard against ActionPanel collision: Ctrl+K or Cmd+K
  if (
    keyEquivalent === "k" &&
    (def.mod1 === "ctrl" || def.mod1 === "physical_ctrl") &&
    (is2Key || def.mod2 === "ctrl")
  ) {
    return buildShortcut(DEFAULT_SHORTCUT_CONFIG.playPause!);
  }

  const macMods: Keyboard.KeyModifier[] = [mapModifier(def.mod1, "macOS")];
  const winMods: Keyboard.KeyModifier[] = [mapModifier(def.mod1, "Windows")];

  if (!is2Key) {
    macMods.push(mapModifier(def.mod2, "macOS"));
    winMods.push(mapModifier(def.mod2, "Windows"));
  }

  return {
    macOS: {
      modifiers: Array.from(new Set(macMods)),
      key: keyEquivalent,
    },
    Windows: {
      modifiers: Array.from(new Set(winMods)),
      key: keyEquivalent,
    },
  };
}

function getActionDef(
  actionKey: string,
  prefPrefix: string,
  prefs: Record<string, string | undefined>,
): ShortcutDefinition {
  const def = DEFAULT_SHORTCUT_CONFIG[actionKey]!;
  if (forcedDefaults) return def;
  const mod1 = prefs[`shortcut${prefPrefix}Mod1`]?.trim() || def.mod1;
  const mod2 = prefs[`shortcut${prefPrefix}Mod2`]?.trim() || def.mod2;
  const key = prefs[`shortcut${prefPrefix}Key`]?.trim() || def.key;
  return { mod1, mod2, key };
}

export function getShortcuts(prefs: Record<string, string | undefined> = readPreferences()) {
  return {
    playPause: buildShortcut(getActionDef("playPause", "PlayPause", prefs)),
    next: buildShortcut(getActionDef("next", "Next", prefs)),
    previous: buildShortcut(getActionDef("previous", "Previous", prefs)),
    playNext: buildShortcut(getActionDef("playNext", "PlayNext", prefs)),
    addToQueue: buildShortcut(getActionDef("addToQueue", "AddToQueue", prefs)),
    browseArtist: buildShortcut(getActionDef("browseArtist", "BrowseArtist", prefs)),
    browseAlbum: buildShortcut(getActionDef("browseAlbum", "BrowseAlbum", prefs)),
    mute: buildShortcut(getActionDef("mute", "Mute", prefs)),
    volumeUp: buildShortcut(getActionDef("volumeUp", "VolumeUp", prefs)),
    volumeDown: buildShortcut(getActionDef("volumeDown", "VolumeDown", prefs)),
    queue: buildShortcut(getActionDef("queue", "Queue", prefs)),
    shuffle: buildShortcut(getActionDef("shuffle", "Shuffle", prefs)),
    repeat: buildShortcut(getActionDef("repeat", "Repeat", prefs)),
    refresh: buildShortcut(getActionDef("refresh", "Refresh", prefs)),
    preferences: {
      macOS: { modifiers: ["cmd"] as Keyboard.KeyModifier[], key: "." as Keyboard.KeyEquivalent },
      Windows: { modifiers: ["ctrl"] as Keyboard.KeyModifier[], key: "." as Keyboard.KeyEquivalent },
    },
  };
}

export const shortcuts = new Proxy({} as ReturnType<typeof getShortcuts>, {
  get(_target, prop: keyof ReturnType<typeof getShortcuts>) {
    return getShortcuts()[prop];
  },
});
