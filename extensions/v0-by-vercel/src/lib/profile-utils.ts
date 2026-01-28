import { getPreferenceValues } from "@raycast/api";
import type { Profile } from "../types";

interface ActiveProfileDetails {
  apiKey: string | undefined;
  defaultScope: string | null;
}

export function getActiveProfileDetails(
  profiles: Profile[],
  activeProfileId: string | undefined,
): ActiveProfileDetails {
  const preferences = getPreferenceValues<Preferences>();

  let apiKey: string | undefined = undefined;
  let defaultScope: string | null = null;

  if (activeProfileId) {
    const activeProfile = profiles.find((p) => p.id === activeProfileId);
    if (activeProfile) {
      apiKey = activeProfile.apiKey;
      defaultScope = activeProfile.defaultScope || null;
    }
  }

  // Fallback to the API key from preferences if no active profile or profile not found
  if (!apiKey) {
    apiKey = preferences.apiKey;
  }

  return { apiKey, defaultScope };
}
