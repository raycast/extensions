import { environment } from "@raycast/api";
import { existsSync, readFileSync, renameSync, writeFileSync } from "fs";
import { join } from "path";
import { Profile } from "./types";

const PROFILES_FILE = join(environment.supportPath, "profiles.json");

export function loadProfiles(): Profile[] {
  if (!existsSync(PROFILES_FILE)) {
    return [];
  }
  try {
    const raw = readFileSync(PROFILES_FILE, "utf8").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Profile[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveProfiles(profiles: Profile[]): void {
  const tmp = `${PROFILES_FILE}.tmp`;
  writeFileSync(tmp, JSON.stringify(profiles, null, 2), "utf8");
  renameSync(tmp, PROFILES_FILE);
}

export function upsertProfile(
  profiles: Profile[],
  profile: Profile,
): Profile[] {
  const idx = profiles.findIndex((p) => p.id === profile.id);
  if (idx === -1) {
    return [...profiles, profile];
  }
  const next = [...profiles];
  next[idx] = profile;
  return next;
}

export function removeProfile(profiles: Profile[], id: string): Profile[] {
  return profiles.filter((p) => p.id !== id);
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
