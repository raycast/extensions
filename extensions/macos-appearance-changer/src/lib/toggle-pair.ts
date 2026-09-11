import { LocalStorage } from "@raycast/api";

export interface TogglePairConfig {
  profileIdA: string;
  profileIdB: string;
  lastAppliedId: string;
}

const STORAGE_KEY = "toggle-pair";

export class TogglePair {
  static async load(): Promise<TogglePairConfig | null> {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as TogglePairConfig;
    } catch {
      return null;
    }
  }

  static async save(config: TogglePairConfig): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
