import { LocalStorage } from "@raycast/api";

export const ONBOARDING_COMPLETED_STORAGE_KEY = "has-completed-onboarding";
export const COMMAND_HISTORY_STORAGE_KEY = "command-history";
export const SETTINGS_STORAGE_KEY = "inflow-settings-v1";
export const COMMAND_HISTORY_LIMIT = 50;

export interface HistoryItem {
  prompt: string;
  isFavorite: boolean;
}

function normalizeHistoryItem(item: unknown): HistoryItem | null {
  if (typeof item === "string") {
    return {
      prompt: item,
      isFavorite: false,
    };
  }

  if (typeof item === "object" && item !== null && "prompt" in item && typeof item.prompt === "string") {
    return {
      prompt: item.prompt,
      isFavorite: "isFavorite" in item ? !!item.isFavorite : false,
    };
  }

  return null;
}

export async function getOnboardingCompleted(): Promise<boolean> {
  const completed = await LocalStorage.getItem<boolean>(ONBOARDING_COMPLETED_STORAGE_KEY);
  return !!completed;
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  if (completed) {
    await LocalStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, true);
    return;
  }

  await LocalStorage.removeItem(ONBOARDING_COMPLETED_STORAGE_KEY);
}

export async function loadHistory(): Promise<HistoryItem[]> {
  try {
    const historyJson = await LocalStorage.getItem<string>(COMMAND_HISTORY_STORAGE_KEY);
    if (!historyJson) {
      return [];
    }

    const parsed = JSON.parse(historyJson);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map((item) => normalizeHistoryItem(item)).filter((item): item is HistoryItem => item !== null);
  } catch (error) {
    console.error("Failed to load history:", error);
    return [];
  }
}

export async function saveHistory(history: HistoryItem[]): Promise<void> {
  await LocalStorage.setItem(COMMAND_HISTORY_STORAGE_KEY, JSON.stringify(history));
}

export async function upsertHistoryItem(history: HistoryItem[], prompt: string): Promise<HistoryItem[]> {
  const existing = history.find((item) => item.prompt === prompt);
  const nextHistory = [
    { prompt, isFavorite: existing?.isFavorite || false },
    ...history.filter((item) => item.prompt !== prompt),
  ].slice(0, COMMAND_HISTORY_LIMIT);

  await saveHistory(nextHistory);
  return nextHistory;
}

export async function toggleFavorite(history: HistoryItem[], prompt: string): Promise<HistoryItem[]> {
  const nextHistory = history.map((item) =>
    item.prompt === prompt ? { ...item, isFavorite: !item.isFavorite } : item,
  );

  await saveHistory(nextHistory);
  return nextHistory;
}

export async function removeHistoryItem(history: HistoryItem[], prompt: string): Promise<HistoryItem[]> {
  const nextHistory = history.filter((item) => item.prompt !== prompt);
  await saveHistory(nextHistory);
  return nextHistory;
}

export async function clearNonFavoriteHistory(history: HistoryItem[]): Promise<HistoryItem[]> {
  const nextHistory = history.filter((item) => item.isFavorite);
  await saveHistory(nextHistory);
  return nextHistory;
}
