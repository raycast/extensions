export type TweakCategory =
  | "finder"
  | "dock"
  | "screenshots"
  | "desktop"
  | "animations"
  | "keyboard"
  | "trackpad"
  | "safari"
  | "mail"
  | "security"
  | "menubar"
  | "apps"
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

export const CATEGORY_META: Record<TweakCategory, { title: string; icon: string }> = {
  finder: { title: "Finder", icon: "folder" },
  dock: { title: "Dock", icon: "app-window" },
  screenshots: { title: "Screenshots", icon: "image" },
  desktop: { title: "Desktop & Spaces", icon: "desktop-computer" },
  animations: { title: "Animations", icon: "bolt" },
  keyboard: { title: "Keyboard & Input", icon: "text-cursor" },
  trackpad: { title: "Trackpad & Mouse", icon: "cursor-ray" },
  safari: { title: "Safari", icon: "globe-01" },
  mail: { title: "Mail", icon: "envelope" },
  security: { title: "Security & Privacy", icon: "lock" },
  menubar: { title: "Menu Bar & UI", icon: "bar-chart-01" },
  apps: { title: "Apps", icon: "app-window-grid-3x3" },
  misc: { title: "Miscellaneous", icon: "gear" },
};
