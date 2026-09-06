import { ColorConversion } from "./color";
import { LocalStorage } from "@raycast/api";

export type HistoryEntry = {
  id: string;
  createdAt: string;
  conversion: ColorConversion;
};

const HISTORY_KEY = "channel-mixer-history";
const MAX_HISTORY = 30;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveHistory(conversion: ColorConversion): Promise<void> {
  const previous = await getHistory();
  const withoutDuplicate = previous.filter(
    (entry) =>
      entry.conversion.sourceHex !== conversion.sourceHex ||
      entry.conversion.targetHex !== conversion.targetHex,
  );
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    conversion,
  };

  await LocalStorage.setItem(
    HISTORY_KEY,
    JSON.stringify([entry, ...withoutDuplicate].slice(0, MAX_HISTORY)),
  );
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
