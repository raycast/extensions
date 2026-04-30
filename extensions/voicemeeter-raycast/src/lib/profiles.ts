import { readJson, writeJson } from "./storage";
import { ProfileDefinition } from "./types";

const PROFILES_KEY = "vm.profiles.v1";

export async function listProfiles(): Promise<ProfileDefinition[]> {
  const profiles = await readJson<ProfileDefinition[]>(PROFILES_KEY, []);
  return [...profiles].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveProfile(profile: ProfileDefinition): Promise<void> {
  const profiles = await readJson<ProfileDefinition[]>(PROFILES_KEY, []);
  const next = profiles.filter((item) => item.id !== profile.id);
  next.push(profile);
  await writeJson(PROFILES_KEY, next);
}

export async function deleteProfile(profileId: string): Promise<void> {
  const profiles = await readJson<ProfileDefinition[]>(PROFILES_KEY, []);
  await writeJson(
    PROFILES_KEY,
    profiles.filter((item) => item.id !== profileId),
  );
}
