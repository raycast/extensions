import { promises as fs } from "fs";
import { join } from "path";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { ASIDE_USER_DATA_DIR, resolveAsideProfile } from "./constants";

export interface AsideProfile {
  directory: string;
  name: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function fallbackProfile(directory: string): AsideProfile {
  return { directory, name: directory };
}

export async function getAsideProfiles(configuredProfile?: string): Promise<AsideProfile[]> {
  const defaultDirectory = resolveAsideProfile(configuredProfile);

  try {
    const localState = JSON.parse(await fs.readFile(join(ASIDE_USER_DATA_DIR, "Local State"), "utf8")) as unknown;
    if (!isRecord(localState) || !isRecord(localState.profile) || !isRecord(localState.profile.info_cache)) {
      return [fallbackProfile(defaultDirectory)];
    }

    const profiles = Object.entries(localState.profile.info_cache).flatMap(([directory, profile]) => {
      if (!directory || !isRecord(profile)) return [];
      const name = typeof profile.name === "string" && profile.name.trim() ? profile.name.trim() : directory;
      return [{ directory, name }];
    });

    if (!profiles.some((profile) => profile.directory === defaultDirectory)) {
      profiles.push(fallbackProfile(defaultDirectory));
    }

    return profiles.sort((left, right) => {
      if (left.directory === defaultDirectory) return -1;
      if (right.directory === defaultDirectory) return 1;
      return left.name.localeCompare(right.name);
    });
  } catch {
    return [fallbackProfile(defaultDirectory)];
  }
}

export function useAsideProfiles(configuredProfile?: string) {
  const defaultProfile = resolveAsideProfile(configuredProfile);
  const [profile, setProfile] = useState(defaultProfile);
  const { data, isLoading } = usePromise(getAsideProfiles, [defaultProfile]);

  return {
    profile,
    setProfile,
    profiles: data ?? [fallbackProfile(defaultProfile)],
    isLoading,
  };
}
