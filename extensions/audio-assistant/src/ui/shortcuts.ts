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

const MODIFIER_VALUES = new Set(["ctrl", "alt", "shift", "physical_ctrl"]);

function mapModifier(mod: string, platform: "macOS" | "Windows"): Keyboard.KeyModifier {
  if (mod === "alt") return platform === "macOS" ? "opt" : "alt";
  if (mod === "ctrl") return platform === "macOS" ? "cmd" : "ctrl";
  if (mod === "physical_ctrl") return "ctrl";
  if (mod === "shift") return "shift";
  return platform === "macOS" ? "cmd" : "ctrl";
}

export function buildShortcut(
  def: ShortcutDefinition,
  fallbackDef: ShortcutDefinition = DEFAULT_SHORTCUT_CONFIG.playPause!,
): Keyboard.Shortcut {
  const is2Key = !def.key || def.key === "na";

  // Validate: for 2-key combo, Part 2 must NOT be a modifier
  if (is2Key && MODIFIER_VALUES.has(def.mod2)) {
    return def === fallbackDef ? buildShortcut(DEFAULT_SHORTCUT_CONFIG.playPause!) : buildShortcut(fallbackDef);
  }

  // Validate: for 3-key combo, Part 2 MUST be a modifier, and Part 3 must NOT be a modifier
  if (!is2Key && (!MODIFIER_VALUES.has(def.mod2) || MODIFIER_VALUES.has(def.key) || def.key === "na")) {
    return def === fallbackDef ? buildShortcut(DEFAULT_SHORTCUT_CONFIG.playPause!) : buildShortcut(fallbackDef);
  }

  const keyEquivalent = (is2Key ? def.mod2 : def.key) as Keyboard.KeyEquivalent;

  // Guard against ActionPanel collision: Ctrl+K or Cmd+K
  if (
    keyEquivalent === "k" &&
    (def.mod1 === "ctrl" || def.mod1 === "physical_ctrl") &&
    (is2Key || def.mod2 === "ctrl")
  ) {
    return def === fallbackDef ? buildShortcut(DEFAULT_SHORTCUT_CONFIG.playPause!) : buildShortcut(fallbackDef);
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
  const mod1 = prefs[`shortcut${prefPrefix}Mod1`]?.trim() || def.mod1;
  const mod2 = prefs[`shortcut${prefPrefix}Mod2`]?.trim() || def.mod2;
  const key = prefs[`shortcut${prefPrefix}Key`]?.trim() || def.key;
  return { mod1, mod2, key };
}

export function getShortcuts(prefs: Record<string, string | undefined> = readPreferences()) {
  const get = (actionKey: string, prefPrefix: string) => {
    const defaultDef = DEFAULT_SHORTCUT_CONFIG[actionKey]!;
    const def = getActionDef(actionKey, prefPrefix, prefs);
    return buildShortcut(def, defaultDef);
  };
  return {
    playPause: get("playPause", "PlayPause"),
    next: get("next", "Next"),
    previous: get("previous", "Previous"),
    playNext: get("playNext", "PlayNext"),
    addToQueue: get("addToQueue", "AddToQueue"),
    browseArtist: get("browseArtist", "BrowseArtist"),
    browseAlbum: get("browseAlbum", "BrowseAlbum"),
    mute: get("mute", "Mute"),
    volumeUp: get("volumeUp", "VolumeUp"),
    volumeDown: get("volumeDown", "VolumeDown"),
    queue: get("queue", "Queue"),
    shuffle: get("shuffle", "Shuffle"),
    repeat: get("repeat", "Repeat"),
    refresh: get("refresh", "Refresh"),
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
