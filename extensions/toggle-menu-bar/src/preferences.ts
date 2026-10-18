import { MenuBarMode } from "./menu-bar";

// The manifest keeps the original dropdown values so existing installs retain
// their saved options. Map them onto the helper's canonical mode names.
const PREFERENCE_MODES: Record<Preferences["optionOne"], MenuBarMode> = {
  always: "always",
  ondesk: "desktop-only",
  infull: "fullscreen-only",
  never: "never",
};

export function togglePreferences(preferences: Preferences) {
  const firstMode: MenuBarMode | undefined = PREFERENCE_MODES[preferences.optionOne ?? "always"];
  const secondMode: MenuBarMode | undefined = PREFERENCE_MODES[preferences.optionTwo ?? "infull"];
  if (!firstMode || !secondMode) {
    throw new Error("Choose valid menu bar options in extension preferences");
  }
  return { firstMode, secondMode, closeWindow: preferences.closeWindow === true };
}
