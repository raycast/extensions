import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import {
  FlashcardProgress,
  FlashcardProgressSchema,
  Translation,
  TranslationSchema,
} from "./types";

const STORAGE_KEY = "vocabuilder-history";
const HISTORY_CORRUPT_BACKUP_KEY = `${STORAGE_KEY}-corrupt-backup`;
const FLASHCARD_KEY = "vocabuilder-flashcards";
const FLASHCARD_CORRUPT_BACKUP_KEY = `${FLASHCARD_KEY}-corrupt-backup`;

async function backupCorruptedStorage(
  sourceKey: string,
  backupKey: string,
  raw: string,
  error: unknown,
): Promise<void> {
  const existingBackup = await LocalStorage.getItem<string>(backupKey);
  if (!existingBackup) {
    await LocalStorage.setItem(backupKey, raw);
  }
  console.error(
    `[storage] Corrupted data detected for "${sourceKey}". Refusing to overwrite existing data.`,
    error,
  );
}

async function parseStoredArray<T>(
  sourceKey: string,
  backupKey: string,
  raw: string,
  schema: z.ZodType<T[]>,
): Promise<T[] | null> {
  try {
    return schema.parse(JSON.parse(raw));
  } catch (error) {
    await backupCorruptedStorage(sourceKey, backupKey, raw, error);
    return null;
  }
}

export async function getHistory(): Promise<Translation[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  const parsed = await parseStoredArray(
    STORAGE_KEY,
    HISTORY_CORRUPT_BACKUP_KEY,
    raw,
    z.array(TranslationSchema),
  );
  return parsed ?? [];
}

export async function saveTranslation(t: Translation): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const history = raw
    ? await parseStoredArray(
        STORAGE_KEY,
        HISTORY_CORRUPT_BACKUP_KEY,
        raw,
        z.array(TranslationSchema),
      )
    : [];
  if (!history) return false;

  const updated = [t, ...history.filter((h) => h.word !== t.word)];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return true;
}

export async function deleteTranslation(id: string): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  const history = raw
    ? await parseStoredArray(
        STORAGE_KEY,
        HISTORY_CORRUPT_BACKUP_KEY,
        raw,
        z.array(TranslationSchema),
      )
    : [];
  if (!history) return false;

  const updated = history.filter((h) => h.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return true;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

async function getFlashcardProgress(): Promise<Map<string, FlashcardProgress>> {
  const raw = await LocalStorage.getItem<string>(FLASHCARD_KEY);
  if (!raw) return new Map();
  const arr = await parseStoredArray(
    FLASHCARD_KEY,
    FLASHCARD_CORRUPT_BACKUP_KEY,
    raw,
    z.array(FlashcardProgressSchema),
  );
  return new Map((arr ?? []).map((p) => [p.word, p]));
}

export async function saveFlashcardProgress(
  progress: FlashcardProgress,
): Promise<boolean> {
  const raw = await LocalStorage.getItem<string>(FLASHCARD_KEY);
  const arr = raw
    ? await parseStoredArray(
        FLASHCARD_KEY,
        FLASHCARD_CORRUPT_BACKUP_KEY,
        raw,
        z.array(FlashcardProgressSchema),
      )
    : [];
  if (!arr) return false;

  const map = new Map(arr.map((p) => [p.word, p]));
  map.set(progress.word, progress);
  await LocalStorage.setItem(FLASHCARD_KEY, JSON.stringify([...map.values()]));
  return true;
}

interface SessionData {
  sessionCards: Translation[];
  progressMap: Map<string, FlashcardProgress>;
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function getSessionCards(): Promise<SessionData> {
  const [history, progressMap] = await Promise.all([
    getHistory(),
    getFlashcardProgress(),
  ]);
  const now = Date.now();

  const due = history
    .filter((t) => {
      const p = progressMap.get(t.word);
      return p !== undefined && p.nextReviewDate <= now;
    })
    .sort((a, b) => {
      const pa = progressMap.get(a.word)!;
      const pb = progressMap.get(b.word)!;
      return pa.nextReviewDate - pb.nextReviewDate;
    });

  const unseen = history.filter((t) => !progressMap.has(t.word));

  const sessionCards = shuffle([...due, ...unseen].slice(0, 10));
  return { sessionCards, progressMap };
}
