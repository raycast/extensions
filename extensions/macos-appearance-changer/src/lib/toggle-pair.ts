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
    return raw ? (JSON.parse(raw) as TogglePairConfig) : null;
  }

  static async save(config: TogglePairConfig): Promise<void> {
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
