import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { createHistoryRepository, historyPolicy, type HistoryStorage } from "./history-repository";
import type { ErrorCategory, HistoryEntry, RewriteMode } from "./types";

const storage: HistoryStorage = {
  allItems: () => LocalStorage.allItems(),
  getItem: (key) => LocalStorage.getItem(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
};

const repository = createHistoryRepository(storage, {
  now: Date.now,
  createId: randomUUID,
});

export function getHistory(): Promise<HistoryEntry[]> {
  return repository.getHistory();
}

export function beginHistoryAttempt(sourceText: string, mode: RewriteMode): Promise<HistoryEntry> {
  return repository.beginAttempt(sourceText, mode);
}

export function markHistorySuccess(id: string, outputText: string): Promise<HistoryEntry | undefined> {
  return repository.markSuccess(id, outputText);
}

export function markHistoryError(
  id: string,
  errorCategory: ErrorCategory,
  errorMessage: string,
): Promise<HistoryEntry | undefined> {
  return repository.markError(id, errorCategory, errorMessage);
}

export function beginRetry(entry: HistoryEntry): Promise<HistoryEntry> {
  return repository.beginRetry(entry);
}

export function deleteHistoryEntry(id: string): Promise<void> {
  return repository.deleteEntry(id);
}

export function clearHistory(): Promise<void> {
  return repository.clear();
}

export { historyPolicy };
