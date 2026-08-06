import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";

export interface KeyProfile {
  id: string;
  name: string;
  alg: string;
  secret: string;
  secretBase64: boolean;
  privatePem: string;
  publicPem: string;
  useJwks: boolean;
  jwksUri: string;
}

const STORAGE_KEY = "jwt-debugger.key-profiles";

export async function listKeyProfiles(): Promise<KeyProfile[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const profiles = raw ? (JSON.parse(raw) as KeyProfile[]) : [];
  return profiles.sort((a, b) => a.name.localeCompare(b.name));
}

async function persist(profiles: KeyProfile[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

/** Saves a profile, replacing an existing one with the same name. */
export async function saveKeyProfile(profile: Omit<KeyProfile, "id">): Promise<void> {
  const profiles = await listKeyProfiles();
  const index = profiles.findIndex((p) => p.name === profile.name);
  if (index >= 0) {
    profiles[index] = { ...profile, id: profiles[index].id };
  } else {
    profiles.push({ ...profile, id: randomUUID() });
  }
  await persist(profiles);
}

export async function deleteKeyProfile(id: string): Promise<void> {
  await persist((await listKeyProfiles()).filter((p) => p.id !== id));
}
