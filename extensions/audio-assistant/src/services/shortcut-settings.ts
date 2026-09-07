import { buildShortcut, DEFAULT_SHORTCUT_CONFIG, type ShortcutDefinition } from "../ui/shortcuts";
import { shortcutKeys } from "../ui/shortcut-keys";

export const shortcutActions = [
  { id: "favoritePlaying", prefix: "FavoritePlaying", title: "Favorite Playing Track", group: "Playback" },
  { id: "favoriteSelected", prefix: "FavoriteSelected", title: "Favorite Selected Track", group: "Playback" },
  { id: "playPause", prefix: "PlayPause", title: "Play/Pause", group: "Playback" },
  { id: "next", prefix: "Next", title: "Next Track", group: "Playback" },
  { id: "previous", prefix: "Previous", title: "Previous Track", group: "Playback" },
  { id: "shuffle", prefix: "Shuffle", title: "Shuffle", group: "Playback" },
  { id: "repeat", prefix: "Repeat", title: "Repeat", group: "Playback" },
  { id: "volumeUp", prefix: "VolumeUp", title: "Volume Up", group: "Volume" },
  { id: "volumeDown", prefix: "VolumeDown", title: "Volume Down", group: "Volume" },
  { id: "mute", prefix: "Mute", title: "Mute / Unmute Player", group: "Volume" },
  { id: "playNext", prefix: "PlayNext", title: "Play Next", group: "Queue" },
  { id: "addToQueue", prefix: "AddToQueue", title: "Add to Queue", group: "Queue" },
  { id: "queue", prefix: "Queue", title: "Show Queue", group: "Queue" },
  { id: "browseArtist", prefix: "BrowseArtist", title: "Browse Artist", group: "Navigation" },
  { id: "browseAlbum", prefix: "BrowseAlbum", title: "Browse Album", group: "Navigation" },
  { id: "nowPlaying", prefix: "NowPlaying", title: "Now Playing", group: "Navigation" },
  { id: "refresh", prefix: "Refresh", title: "Refresh", group: "Navigation" },
] as const;
export type ShortcutId = (typeof shortcutActions)[number]["id"];
export type ShortcutConfig = Record<string, ShortcutDefinition>;
const modifiers = new Set(["ctrl", "alt", "shift", "physical_ctrl"]);

export function isDefinition(value: unknown): value is ShortcutDefinition {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.mod1 === "string" &&
    modifiers.has(d.mod1) &&
    typeof d.mod2 === "string" &&
    typeof d.key === "string" &&
    (d.key === "na" ? Object.hasOwn(shortcutKeys, d.mod2) : modifiers.has(d.mod2) && Object.hasOwn(shortcutKeys, d.key))
  );
}
function signature(def: ShortcutDefinition, platform: "Windows" | "macOS") {
  const binding = buildShortcut(def)[platform]!;
  return `${[...binding.modifiers].sort().join("+")}:${binding.key}`;
}
export function sameShortcut(a: ShortcutDefinition, b: ShortcutDefinition) {
  return signature(a, "Windows") === signature(b, "Windows") && signature(a, "macOS") === signature(b, "macOS");
}
export function validateShortcut(id: string, def: ShortcutDefinition, config: ShortcutConfig): string | undefined {
  if (!isDefinition(def)) return "Choose at least one modifier and a supported key.";
  // Validate before buildShortcut, whose legacy fallback intentionally masks invalid bindings.
  const key = def.key === "na" ? def.mod2 : def.key;
  const mods = def.key === "na" ? [def.mod1] : [def.mod1, def.mod2];
  for (const platform of ["Windows", "macOS"] as const) {
    const physical = mods.map((m) =>
      m === "ctrl" ? (platform === "macOS" ? "cmd" : "ctrl") : m === "physical_ctrl" ? "ctrl" : m,
    );
    const unique = new Set(physical);
    if (unique.size !== physical.length) return `Choose different modifiers (${platform}).`;
    if (unique.size === 1 && unique.has("shift")) return "Shift alone is reserved for typing and selection.";
    const primary = platform === "macOS" ? "cmd" : "ctrl";
    if (unique.has(primary) && !unique.has("alt")) {
      if (key === "." && (unique.size === 1 || (unique.size === 2 && unique.has("shift"))))
        return "This shortcut opens Extension Preferences or Keyboard Shortcuts.";
      if (key === "k" && unique.size === 1) return "This shortcut opens Raycast’s action panel.";
      if (["a", "c", "v", "x", "z"].includes(key) && unique.size === 1)
        return "This shortcut is reserved for text editing.";
    }
    for (const action of shortcutActions) {
      if (
        action.id !== id &&
        signature(def, platform) === signature(config[action.id] ?? DEFAULT_SHORTCUT_CONFIG[action.id]!, platform)
      )
        return `Already used by ${action.title} on ${platform}.`;
    }
  }
}
export function toPreferences(config: ShortcutConfig): Record<string, string> {
  return Object.fromEntries(
    shortcutActions.flatMap(({ id, prefix }) => {
      const d = config[id] ?? DEFAULT_SHORTCUT_CONFIG[id]!;
      return [
        [`shortcut${prefix}Mod1`, d.mod1],
        [`shortcut${prefix}Mod2`, d.mod2],
        [`shortcut${prefix}Key`, d.key],
      ];
    }),
  );
}
export interface ShortcutStorage {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}
export interface ShortcutSnapshot {
  config: ShortcutConfig;
  ready: boolean;
  review: boolean;
  error?: string;
}
export const SHORTCUT_STORAGE_KEY = "music-shortcuts-v1";
export class ShortcutSettings {
  private snapshot: ShortcutSnapshot = { config: { ...DEFAULT_SHORTCUT_CONFIG }, ready: false, review: false };
  private listeners = new Set<() => void>();
  private pending?: Promise<void>;
  private saving = false;
  constructor(
    private storage: ShortcutStorage,
    private legacy: () => Record<string, unknown>,
  ) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(next: ShortcutSnapshot) {
    this.snapshot = next;
    this.listeners.forEach((fn) => fn());
  }
  initialize = (): Promise<void> => {
    if (this.pending) return this.pending;
    this.pending = this.load();
    return this.pending;
  };
  private async load() {
    try {
      const raw = await this.storage.getItem(SHORTCUT_STORAGE_KEY);
      const config: ShortcutConfig = { ...DEFAULT_SHORTCUT_CONFIG };
      let review = true;
      if (raw !== undefined) {
        const parsed: unknown = JSON.parse(raw);
        if (
          !parsed ||
          typeof parsed !== "object" ||
          !("version" in parsed) ||
          parsed.version !== 1 ||
          !("config" in parsed) ||
          !parsed.config ||
          typeof parsed.config !== "object"
        )
          throw new Error("invalid storage");
        const values = parsed.config as Record<string, unknown>;
        for (const { id } of shortcutActions) {
          // These actions were added after v1 shipped; preserve every existing override on upgrade.
          if (values[id] === undefined && (id === "favoritePlaying" || id === "favoriteSelected")) continue;
          if (!isDefinition(values[id])) throw new Error("invalid shortcut");
          config[id] = values[id];
        }
        review = !("reviewed" in parsed && parsed.reviewed === true);
      } else {
        const prefs = this.legacy();
        for (const { id, prefix } of shortcutActions) {
          const fallback = DEFAULT_SHORTCUT_CONFIG[id]!;
          const d = {
            mod1: prefs[`shortcut${prefix}Mod1`] ?? fallback.mod1,
            mod2: prefs[`shortcut${prefix}Mod2`] ?? fallback.mod2,
            key: prefs[`shortcut${prefix}Key`] ?? fallback.key,
          };
          if (isDefinition(d)) {
            // Preserve the old effective binding, including its reserved-key fallback.
            config[id] = buildShortcut(d, fallback).Windows?.key === (d.key === "na" ? d.mod2 : d.key) ? d : fallback;
          }
        }
        await this.persist(config, false);
      }
      this.publish({ config, ready: true, review });
    } catch {
      this.publish({
        ...this.snapshot,
        ready: true,
        error:
          "Unable to load saved shortcuts. Defaults are active; saved data has not been overwritten. Reopen Music to retry, or restore all defaults in Keyboard Shortcuts.",
      });
    }
  }
  private persist(config: ShortcutConfig, reviewed: boolean) {
    return this.storage.setItem(SHORTCUT_STORAGE_KEY, JSON.stringify({ version: 1, config, reviewed }));
  }
  async save(id: ShortcutId, def: ShortcutDefinition) {
    const error = validateShortcut(id, def, this.snapshot.config);
    if (error) throw new Error(error);
    await this.commit({ ...this.snapshot.config, [id]: def }, !this.snapshot.review);
  }
  async reset(id?: ShortcutId) {
    if (id) return this.save(id, DEFAULT_SHORTCUT_CONFIG[id]!);
    await this.commit({ ...DEFAULT_SHORTCUT_CONFIG }, true, true);
  }
  async acknowledge() {
    await this.commit(this.snapshot.config, true);
  }
  private async commit(config: ShortcutConfig, reviewed: boolean, recover = false) {
    if (this.saving) throw new Error("A shortcut change is already being saved.");
    if (this.snapshot.error && !recover)
      throw new Error("Restore all defaults before saving over unreadable shortcut data.");
    this.saving = true;
    try {
      await this.persist(config, reviewed);
      this.publish({ config, ready: true, review: !reviewed });
    } finally {
      this.saving = false;
    }
  }
}
