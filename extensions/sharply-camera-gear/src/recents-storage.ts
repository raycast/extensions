import { LocalStorage } from "@raycast/api";
import type { Gear } from "./catalog";
import { createRecentHistory } from "./recents";

const key = "recently-opened-gear";
export const recentHistory = createRecentHistory(
  async () => {
    const saved = await LocalStorage.getItem<string>(key);
    return saved ? (JSON.parse(saved) as Gear[]) : [];
  },
  async (items) => LocalStorage.setItem(key, JSON.stringify(items)),
);

export async function readRecentGear() {
  return recentHistory.load();
}
