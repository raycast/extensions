import { MENU_BAR_MODES } from "./menu-bar";

export function togglePreferences(preferences: Preferences) {
  const firstMode = preferences.optionOne ?? "always";
  const secondMode = preferences.optionTwo ?? "fullscreen-only";
  if (
    !MENU_BAR_MODES.some(({ value }) => value === firstMode) ||
    !MENU_BAR_MODES.some(({ value }) => value === secondMode)
  ) {
    throw new Error("Choose valid menu bar options in extension preferences");
  }
  return { firstMode, secondMode, closeWindow: preferences.closeWindow === true };
}
