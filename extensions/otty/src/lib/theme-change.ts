import { Alert, confirmAlert, Icon } from "@raycast/api";
import { showFailure } from "./otty";
import { applySetting, changeSetting, loadAutoDarkMode, loadThemeOverrides } from "./otty-config";
import { buildConfigSetArgs, buildConfigUnsetArgs } from "./otty-core";
import { describeOverrides, THEME_KEYS, unconfirmedKeys, type ThemeMode } from "./themes";

export const THEME_SLOT_TITLES: Record<ThemeMode, string> = { light: "Light Mode", dark: "Dark Mode" };

/**
 * Sets the light- or dark-mode theme. Colors set in the config win over every theme, so when any
 * are set this asks before resetting them; otherwise the theme would change with nothing to see.
 * Shared by Change Otty Theme and Otty Settings' Theme rows. Resolves true once the theme is set.
 */
export async function applyTheme(
  name: string,
  slot: ThemeMode,
  onChange: () => void,
  cachedAutoDarkMode?: boolean,
): Promise<boolean> {
  let overrides: string[];
  try {
    overrides = await loadThemeOverrides();
  } catch (error) {
    await showFailure("Could not read your Otty config", error);
    return false;
  }
  // Ask about the colors set now; if more appear while the alert is open, ask again, since the user
  // only agreed to reset the ones they saw. Keys that went away just drop out.
  while (overrides.length > 0) {
    const confirmed = await confirmAlert({
      title: "Override your custom theme settings?",
      message: `Your Otty config sets its own colors (${describeOverrides(overrides)}), which take priority over every theme. Reset them to use ${name}.`,
      icon: Icon.Brush,
      primaryAction: { title: "Override", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return false;
    let current: string[];
    try {
      current = await loadThemeOverrides();
    } catch (error) {
      await showFailure("Could not read your Otty config", error);
      return false;
    }
    const unconfirmed = unconfirmedKeys(overrides, current);
    overrides = current;
    if (unconfirmed.length === 0) break;
  }
  if (overrides.length > 0) {
    try {
      await changeSetting(buildConfigUnsetArgs(...overrides));
    } catch (error) {
      await showFailure("Could not reset your custom colors", error);
      return false;
    }
    onChange();
  }
  // Read now, not from the grid's cache; if it can't be read, the cached value still beats saying nothing.
  const autoDark = slot === "dark" ? await loadAutoDarkMode().catch(() => cachedAutoDarkMode) : undefined;
  const notes = [
    overrides.length > 0 ? `Reset ${describeOverrides(overrides)}.` : undefined,
    // Without auto switching, Otty only ever shows the light-mode theme.
    slot === "dark" && autoDark === false ? "Turn on auto-theme-dark-mode for Otty to use it." : undefined,
  ].filter(Boolean);
  return applySetting(
    buildConfigSetArgs(THEME_KEYS[slot], name),
    { title: `${THEME_SLOT_TITLES[slot]} theme: ${name}`, message: notes.length > 0 ? notes.join(" ") : undefined },
    // The colors are already gone at this point; say so rather than implying nothing changed.
    overrides.length > 0 ? "Reset your custom colors, but could not change the theme" : "Could not change theme",
    onChange,
  );
}
