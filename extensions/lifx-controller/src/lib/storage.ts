import { LocalStorage } from "@raycast/api";
import { LightProfile } from "./types";

const PROFILES_KEY = "lifx-profiles";

export class ProfileStorage {
  async getProfiles(): Promise<LightProfile[]> {
    const data = await LocalStorage.getItem<string>(PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  }

  async saveProfile(profile: LightProfile): Promise<void> {
    const profiles = await this.getProfiles();
    const existingIndex = profiles.findIndex((p) => p.id === profile.id);

    if (existingIndex >= 0) {
      profiles[existingIndex] = { ...profile, updatedAt: new Date().toISOString() };
    } else {
      profiles.push(profile);
    }

    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  }

  async deleteProfile(profileId: string): Promise<void> {
    const profiles = await this.getProfiles();
    const filtered = profiles.filter((p) => p.id !== profileId);
    await LocalStorage.setItem(PROFILES_KEY, JSON.stringify(filtered));
  }

  async getProfile(profileId: string): Promise<LightProfile | null> {
    const profiles = await this.getProfiles();
    return profiles.find((p) => p.id === profileId) ?? null;
  }
}
