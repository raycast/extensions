import { Modifiers } from "./modifiers";

export interface Shortcuts {
  applications: Application[];
}

export interface Application {
  bundleId?: string;
  windowsAppId?: string;
  windowsProcessName?: string;
  hostname?: string;
  name: string;
  slug: string;
  source?: string;
  icon?: string;
  customAppId?: string;
  keymaps: Keymap[];
}

export interface Keymap {
  customKeymapId?: string;
  title: string;
  platforms?: string[];
  sections: Section[];
}

export interface Section {
  title: string;
  hotkeys: SectionShortcut[];
}

export interface SectionShortcut {
  title: string;
  sequence: AtomicShortcut[];
  comment?: string;
  customizationStatus?: "changed" | "created";
  customizationId?: string;
  baseSectionTitle?: string;
  baseShortcutTitle?: string;
  baseShortcutId?: string;
  baseShortcutAliases?: string[];
  customShortcutId?: string;
}

export interface AtomicShortcut {
  base: string;
  modifiers: Modifiers[];
}
