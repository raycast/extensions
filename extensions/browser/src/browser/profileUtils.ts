import type { BrowserProfile } from "./types";

export function makeProfileId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalize(text: string) {
  return text.trim().toLowerCase();
}

export function matchesProfileHint(profile: BrowserProfile, normalizedHint: string) {
  if (!normalizedHint) {
    return true;
  }

  return [profile.name, profile.browserApp, profile.profileDirectory]
    .map((value) => normalize(value))
    .some((value) => value.includes(normalizedHint));
}

export function findProfileByHint(profiles: BrowserProfile[], hint: string) {
  const normalizedHint = normalize(hint);

  if (!normalizedHint) {
    return undefined;
  }

  const exactMatch = profiles.find((profile) =>
    [profile.name, profile.browserApp, profile.profileDirectory]
      .map((value) => normalize(value))
      .some((value) => value === normalizedHint),
  );

  if (exactMatch) {
    return exactMatch;
  }

  return profiles.find((profile) => matchesProfileHint(profile, normalizedHint));
}

export function sortProfiles(profiles: BrowserProfile[]) {
  return [...profiles].sort((left, right) => {
    if (left.isDefault && !right.isDefault) {
      return -1;
    }

    if (!left.isDefault && right.isDefault) {
      return 1;
    }

    return left.name.localeCompare(right.name);
  });
}

export function upsertProfile(profiles: BrowserProfile[], profile: BrowserProfile) {
  const nextProfiles = profiles.some((entry) => entry.id === profile.id)
    ? profiles.map((entry) => (entry.id === profile.id ? profile : entry))
    : [...profiles, profile];

  return sortProfiles(nextProfiles);
}

export function setDefaultProfile(profiles: BrowserProfile[], defaultId: string) {
  return profiles.map((profile) => ({
    ...profile,
    isDefault: profile.id === defaultId,
  }));
}
