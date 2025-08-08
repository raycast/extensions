import { getPreferenceValues } from "@raycast/api";
import type { Profile } from "../types";

interface Preferences {
  apiKey?: string;
  defaultScope?: string;
}

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
    // If no active profile is set, and we're falling back to preferences, also use preference defaultScope
    if (!activeProfileId) {
      defaultScope = preferences.defaultScope || null;
    }
  }

  return { apiKey, defaultScope };
}
