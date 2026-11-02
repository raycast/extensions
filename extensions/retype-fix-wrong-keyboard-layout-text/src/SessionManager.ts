import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "retype_history";

export interface LayoutHistory {
  /** Layout IDs ordered most-recently-used first. */
  targetOrder: string[];
}

export const HistoryManager = {
  async load(): Promise<LayoutHistory> {
    const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
    if (!raw) {
      return { targetOrder: [] };
    }
    try {
      return JSON.parse(raw) as LayoutHistory;
    } catch {
      return { targetOrder: [] };
    }
  },

  /** Move targetId to front of history (most recently used). */
  async recordSuccess(targetId: string): Promise<void> {
    const history = await HistoryManager.load();
    const updated = [
      targetId,
      ...history.targetOrder.filter((id) => id !== targetId),
    ];
    await LocalStorage.setItem(
      HISTORY_KEY,
      JSON.stringify({ targetOrder: updated }),
    );
  },
};
