import { randomUUID } from "node:crypto";
import { LocalStorage } from "@raycast/api";
import { isTranslationTargetId, type TranslationTarget } from "./openai-compatible";

const HISTORY_STORAGE_KEY = "translation-history";
const HISTORY_LIMIT = 100;

export interface TranslationHistoryEntry {
  id: string;
  sourceText: string;
  translatedText: string;
  targetId: TranslationTarget["id"];
  targetName: string;
  model: string;
  createdAt: string;
}

export async function readTranslationHistory(): Promise<TranslationHistoryEntry[]> {
  const storedHistory = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);
  if (!storedHistory) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedHistory) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isTranslationHistoryEntry) : [];
  } catch {
    return [];
  }
}

export async function addTranslationToHistory(
  sourceText: string,
  translatedText: string,
  target: TranslationTarget,
  model: string,
): Promise<TranslationHistoryEntry> {
  const entry: TranslationHistoryEntry = {
    id: randomUUID(),
    sourceText,
    translatedText,
    targetId: target.id,
    targetName: target.displayName,
    model,
    createdAt: new Date().toISOString(),
  };
  const history = await readTranslationHistory();

  await writeTranslationHistory([entry, ...history].slice(0, HISTORY_LIMIT));
  return entry;
}

export async function removeTranslationFromHistory(entryId: string): Promise<void> {
  const history = await readTranslationHistory();
  await writeTranslationHistory(history.filter((entry) => entry.id !== entryId));
}

export async function clearTranslationHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_STORAGE_KEY);
}

async function writeTranslationHistory(history: TranslationHistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
}

function isTranslationHistoryEntry(value: unknown): value is TranslationHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<TranslationHistoryEntry>;
  return (
    typeof entry.id === "string" &&
    typeof entry.sourceText === "string" &&
    typeof entry.translatedText === "string" &&
    isTranslationTargetId(entry.targetId) &&
    typeof entry.targetName === "string" &&
    typeof entry.model === "string" &&
    typeof entry.createdAt === "string" &&
    !Number.isNaN(Date.parse(entry.createdAt))
  );
}
