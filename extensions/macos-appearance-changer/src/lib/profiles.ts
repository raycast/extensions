import { LocalStorage } from "@raycast/api";
import { isValidProfile } from "../utils/validate-profile.util";
import { Profile } from "../types/types";

const STORAGE_KEY = "appearance-profiles";

export class Profiles {
  static async getAll(): Promise<Profile[]> {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return [];

    try {
      const parsed: unknown[] = JSON.parse(raw);
      return parsed.filter(isValidProfile);
    } catch {
      return [];
    }
  }

  static async save(profile: Profile): Promise<void> {
    const profiles = await Profiles.getAll();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);
    if (existingIndex >= 0) {
      profiles[existingIndex] = profile;
    } else {
      profiles.push(profile);
    }
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  }

  static async delete(profileId: string): Promise<void> {
    const profiles = await Profiles.getAll();
    const filtered = profiles.filter((p) => p.id !== profileId);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
}
