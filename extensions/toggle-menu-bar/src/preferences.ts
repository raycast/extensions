import { MenuBarMode } from "./menu-bar";

const LEGACY_MODES: Record<string, MenuBarMode> = {
  always: "always",
  ondesk: "desktop-only",
  infull: "fullscreen-only",
  never: "never",
};

export interface ExtensionPreferences {
  closeWindow?: boolean;
  optionOne?: string;
  optionTwo?: string;
}

export function togglePreferences(preferences: ExtensionPreferences) {
  const firstMode = LEGACY_MODES[preferences.optionOne ?? "always"];
  const secondMode = LEGACY_MODES[preferences.optionTwo ?? "infull"];
  if (!firstMode || !secondMode) {
    throw new Error("Choose valid menu bar options in extension preferences");
  }
  return { firstMode, secondMode, closeWindow: preferences.closeWindow === true };
}
