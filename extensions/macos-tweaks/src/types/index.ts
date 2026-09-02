import { Icon } from "@raycast/api";

export type TweakCategory =
  | "finder"
  | "dock"
  | "screenshots"
  | "desktop"
  | "windows"
  | "animations"
  | "keyboard"
  | "trackpad"
  | "safari"
  | "mail"
  | "security"
  | "menubar"
  | "apps"
  | "sound"
  | "misc";

export type TweakType = "boolean" | "string" | "number" | "enum";

export type TweakValue = boolean | string | number;

export type EnumOption = {
  title: string;
  value: string | number;
};

export type TweakRisk = "safe" | "moderate";

export interface TweakDefinition {
  id: string;
  title: string;
  description: string;
  category: TweakCategory;
  domain: string;
  key: string;
  type: TweakType;
  defaultValue: TweakValue;
  options?: EnumOption[];
  min?: number;
  max?: number;
  requiresRestart?: string;
  minMacOS?: string;
  maxMacOS?: string;
  risk: TweakRisk;
  tags: string[];
  /**
   * Some tweaks need multiple commands — extra domain/key pairs to also set.
   *
   * Two variants:
   * - `{ domain, key, value }` — writes a fixed value when the primary is enabled,
   *   inverts booleans (or deletes non-booleans) when the primary reverts to default.
   * - `{ domain, key, mirrorPrimary: true }` — writes the same value as the primary
   *   tweak. Useful when two keys must stay in sync (e.g. TextEdit encoding keys).
   *   The primary and extra keys must accept compatible types.
   */
  extraDefaults?: ExtraDefault[];
}

export type ExtraDefault =
  | { domain: string; key: string; value: TweakValue; mirrorPrimary?: false }
  | { domain: string; key: string; mirrorPrimary: true };

export interface TweakState extends TweakDefinition {
  currentValue: TweakValue;
  isModified: boolean;
}

export const CATEGORY_META: Record<TweakCategory, { title: string; icon: Icon }> = {
  finder: { title: "Finder", icon: Icon.Finder },
  dock: { title: "Dock", icon: Icon.AppWindowList },
  screenshots: { title: "Screenshots", icon: Icon.Image },
  desktop: { title: "Desktop & Spaces", icon: Icon.Desktop },
  windows: { title: "Windows & Stage Manager", icon: Icon.Window },
  animations: { title: "Animations", icon: Icon.Bolt },
  keyboard: { title: "Keyboard & Input", icon: Icon.Keyboard },
  trackpad: { title: "Trackpad & Mouse", icon: Icon.Mouse },
  safari: { title: "Safari", icon: Icon.Compass },
  mail: { title: "Mail", icon: Icon.Envelope },
  security: { title: "Security & Privacy", icon: Icon.Lock },
  menubar: { title: "Menu Bar & UI", icon: Icon.Sidebar },
  apps: { title: "Apps", icon: Icon.AppWindowGrid3x3 },
  sound: { title: "Sound", icon: Icon.Speaker },
  misc: { title: "Miscellaneous", icon: Icon.Gear },
};
