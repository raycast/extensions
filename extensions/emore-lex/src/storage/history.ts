import { LocalStorage } from "@raycast/api";
import { HistoryItem, StudyStats } from "../types/word";

const HISTORY_KEY = "history";
const MAX_HISTORY_ITEMS = 200;

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [];
  }
}

export async function recordHistory(word: string): Promise<void> {
  const normalizedWord = word.trim().toLowerCase();
  if (!normalizedWord) return;

  const history = await getHistory();
  const nextHistory = [
    { word: normalizedWord, queryTime: new Date().toISOString() },
    ...history.filter((item) => item.word.toLowerCase() !== normalizedWord),
  ].slice(0, MAX_HISTORY_ITEMS);

  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
}

export function getStudyStats(history: HistoryItem[], now = new Date()): StudyStats {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay() || 7;
  startOfWeek.setDate(startOfWeek.getDate() - day + 1);
  startOfWeek.setHours(0, 0, 0, 0);

  return {
    today: history.filter((item) => new Date(item.queryTime) >= startOfToday).length,
    week: history.filter((item) => new Date(item.queryTime) >= startOfWeek).length,
    total: history.length,
  };
}
