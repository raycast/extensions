// Generated from shared/shortcuts-core; run scripts/sync-shortcuts-core.mjs --write.
export type Platform = "macos" | "windows" | "linux";
export type ModifierToken = "ctrl" | "shift" | "opt" | "cmd" | "win";
export interface Chord {
  base: string;
  modifiers: ModifierToken[];
}
export interface IdentifiableShortcut {
  title: string;
  comment?: string;
  sequence: { base: string; modifiers: readonly string[] }[];
}

export interface CustomApp<P extends string = string> {
  id: string;
  userId: string;
  slug: string;
  name: string;
  bundleId?: string;
  hostname?: string;
  source?: string;
  icon?: string;
  keymaps: CustomKeymap<P>[];
}

export interface CustomKeymap<P extends string = string> {
  id: string;
  customAppId?: string;
  baseAppSlug?: string;
  title: string;
  sortOrder?: number;
  platforms?: P[];
  sections: CustomSection[];
}

export interface CustomSection {
  id: string;
  keymapId: string;
  title: string;
  sortOrder: number;
  shortcuts: CustomShortcut[];
}

export interface CustomShortcut {
  id: string;
  sectionId?: string;
  baseAppSlug?: string;
  baseKeymapTitle?: string;
  baseSectionTitle?: string;
  baseShortcutTitle?: string;
  baseShortcutId?: string;
  title: string;
  key?: string;
  keyIsCleared?: boolean;
  commentIsCleared?: boolean;
  comment?: string;
  isDeleted: boolean;
  sortOrder: number;
}

export interface Favorite {
  id: string;
  userId: string;
  itemType: "app" | "keymap" | "shortcut";
  appSlug?: string;
  keymapTitle?: string;
  shortcutTitle?: string;
  sectionTitle?: string;
  baseShortcutId?: string;
  customAppId?: string;
  customKeymapId?: string;
  customShortcutId?: string;
}

export interface ShortcutOverlay {
  baseKey: string;
  baseShortcutId?: string;
  modification: Partial<CustomShortcut>;
}

export interface UserCustomizations<P extends string = string> {
  customApps: CustomApp<P>[];
  customKeymaps: CustomKeymap<P>[];
  shortcuts: ShortcutOverlay[];
  favorites: Favorite[];
}

export interface AppShortcuts<M extends string = string, P extends string = string> {
  bundleId?: string;
  windowsAppId?: string;
  windowsProcessName?: string;
  hostname?: string;
  customAppId?: string;
  name: string;
  slug: string;
  source?: string;
  icon?: string;
  keymaps: Keymap<M, P>[];
}

export interface Keymap<M extends string = string, P extends string = string> {
  customKeymapId?: string;
  title: string;
  platforms?: P[];
  sections: Section<M>[];
}

export interface Section<M extends string = string> {
  title: string;
  hotkeys: SectionShortcut<M>[];
}

export interface SectionShortcut<M extends string = string> {
  title: string;
  sequence: AtomicShortcut<M>[];
  comment?: string;
  customizationStatus?: "changed" | "created";
  customizationId?: string;
  baseSectionTitle?: string;
  baseShortcutTitle?: string;
  baseShortcutId?: string;
  baseShortcutAliases?: string[];
  customShortcutId?: string;
}

export interface AtomicShortcut<M extends string = string> {
  base: string;
  modifiers: M[];
}
