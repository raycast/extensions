import { Modifiers } from "./modifiers";

export interface Shortcuts {
  applications: Application[];
}

export interface Application {
  bundleId?: string;
  hostname?: string;
  name: string;
  slug: string;
  keymaps: Keymap[];
}

export interface Keymap {
  title: string;
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
}

export interface AtomicShortcut {
  base: string;
  modifiers: Modifiers[];
}
