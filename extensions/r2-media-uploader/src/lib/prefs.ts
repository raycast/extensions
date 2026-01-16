import { getPreferenceValues } from "@raycast/api";
import type { BucketProfile, Preferences } from "./types";

export function loadPreferences(): { prefs: Preferences; profiles: BucketProfile[] } {
  const prefs = getPreferenceValues<Preferences>();

  let profiles: BucketProfile[] = [];
  try {
    const parsed = JSON.parse(prefs.bucketProfilesJson || "[]") as unknown;
    if (Array.isArray(parsed)) profiles = parsed as BucketProfile[];
  } catch {
    profiles = [];
  }

  const normalizedProfiles = profiles
    .filter((p) => Boolean(p?.name) && Boolean(p?.bucket))
    .map((p) => ({
      ...p,
      publicBaseUrl: p.publicBaseUrl?.trim() ? p.publicBaseUrl.trim() : undefined,
    }));

  return {
    prefs,
    profiles: normalizedProfiles,
  };
}

export function pickDefaultProfile(profiles: BucketProfile[], defaultName?: string): BucketProfile | undefined {
  if (!profiles.length) return undefined;
  if (defaultName) {
    const match = profiles.find((p) => p.name === defaultName);
    if (match) return match;
  }
  return profiles[0];
}
