import { getPreferenceValues } from "@raycast/api";
import { ChocoPreferences } from "./types";

/**
 * Returns typed extension preferences with safe defaults.
 */
export function getChocoPreferences(): ChocoPreferences {
  const prefs = getPreferenceValues<Partial<ChocoPreferences>>();
  return {
    chocoPath: prefs.chocoPath?.trim() || undefined,
    elevationMethod: prefs.elevationMethod ?? "uac",
    confirmAutomatically: prefs.confirmAutomatically ?? true,
    useCommunityApi: prefs.useCommunityApi ?? true,
    includePrerelease: prefs.includePrerelease ?? false,
    showPackageIcons: prefs.showPackageIcons ?? true,
  };
}
