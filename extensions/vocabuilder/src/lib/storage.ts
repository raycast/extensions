import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import { FlashcardProgress, FlashcardProgressSchema, Translation, TranslationSchema } from "./types";
import { LanguagePair, storageKeyPrefix } from "./languages";

function historyKey(pair: LanguagePair): string {
  return `vocabuilder-history-${storageKeyPrefix(pair)}`;
}

function historyCorruptBackupKey(pair: LanguagePair): string {
  return `${historyKey(pair)}-corrupt-backup`;
}

function flashcardKey(pair: LanguagePair): string {
  return `vocabuilder-flashcards-${storageKeyPrefix(pair)}`;
}

function flashcardCorruptBackupKey(pair: LanguagePair): string {
  return `${flashcardKey(pair)}-corrupt-backup`;
}

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
  console.error(`[storage] Corrupted data detected for "${sourceKey}". Refusing to overwrite existing data.`, error);
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

/** True when b describes the same saved sense as a (lemma + gloss + POS for words). */
function senseMatchesStoredTranslation(a: Translation, b: Translation): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "text") {
    return a.word === b.word;
  }
  return (
    a.word === b.word &&
    a.translation.trim().toLowerCase() === b.translation.trim().toLowerCase() &&
    a.partOfSpeech.trim().toLowerCase() === b.partOfSpeech.trim().toLowerCase()
  );
}

/** LocalStorage map key for a flashcard progress row — matches `Translation.id`. */
function flashcardProgressStorageKey(p: FlashcardProgress): string {
  return p.translationId;
}

export async function getHistory(pair: LanguagePair): Promise<Translation[]> {
  const key = historyKey(pair);
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return [];
  const parsed = await parseStoredArray(key, historyCorruptBackupKey(pair), raw, z.array(TranslationSchema));
  return parsed ?? [];
}

export async function saveTranslation(t: Translation, pair: LanguagePair): Promise<Translation | null> {
  const key = historyKey(pair);
  const raw = await LocalStorage.getItem<string>(key);
  const history = raw
    ? await parseStoredArray(key, historyCorruptBackupKey(pair), raw, z.array(TranslationSchema))
    : [];
  if (!history) return null;

  const existing = history.find((h) => senseMatchesStoredTranslation(h, t));
  const merged: Translation = existing ? { ...t, id: existing.id, timestamp: Date.now() } : t;
  const updated = [merged, ...history.filter((h) => h.id !== merged.id)];
  await LocalStorage.setItem(key, JSON.stringify(updated));
  return merged;
}

export async function deleteTranslation(id: string, pair: LanguagePair): Promise<boolean> {
  const key = historyKey(pair);
  const raw = await LocalStorage.getItem<string>(key);
  const history = raw
    ? await parseStoredArray(key, historyCorruptBackupKey(pair), raw, z.array(TranslationSchema))
    : [];
  if (!history) return false;

  const updated = history.filter((h) => h.id !== id);
  await LocalStorage.setItem(key, JSON.stringify(updated));
  return true;
}

export async function clearHistory(pair: LanguagePair): Promise<void> {
  await LocalStorage.removeItem(historyKey(pair));
}

async function getFlashcardProgress(pair: LanguagePair): Promise<Map<string, FlashcardProgress>> {
  const key = flashcardKey(pair);
  const raw = await LocalStorage.getItem<string>(key);
  if (!raw) return new Map();
  const arr = await parseStoredArray(key, flashcardCorruptBackupKey(pair), raw, z.array(FlashcardProgressSchema));
  return new Map((arr ?? []).map((p) => [flashcardProgressStorageKey(p), p]));
}

export async function saveFlashcardProgress(progress: FlashcardProgress, pair: LanguagePair): Promise<boolean> {
  const key = flashcardKey(pair);
  const raw = await LocalStorage.getItem<string>(key);
  const arr = raw
    ? await parseStoredArray(key, flashcardCorruptBackupKey(pair), raw, z.array(FlashcardProgressSchema))
    : [];
  if (!arr) return false;

  const map = new Map(arr.map((p) => [flashcardProgressStorageKey(p), p]));
  map.set(flashcardProgressStorageKey(progress), progress);
  await LocalStorage.setItem(key, JSON.stringify([...map.values()]));
  return true;
}

function progressForWordCard(t: Translation, rawMap: Map<string, FlashcardProgress>): FlashcardProgress | undefined {
  if (t.type !== "word") return undefined;
  return rawMap.get(t.id);
}

function normalizeProgressForCard(p: FlashcardProgress, card: Translation): FlashcardProgress {
  return { ...p, word: card.word, translationId: card.id };
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

export async function getSessionCards(pair: LanguagePair): Promise<SessionData> {
  const [allHistory, rawProgressMap] = await Promise.all([getHistory(pair), getFlashcardProgress(pair)]);
  const history = allHistory.filter((t) => t.type !== "text");
  const now = Date.now();

  const due = history
    .filter((t) => {
      const p = progressForWordCard(t, rawProgressMap);
      return p !== undefined && p.nextReviewDate <= now;
    })
    .sort((a, b) => {
      const pa = progressForWordCard(a, rawProgressMap)!;
      const pb = progressForWordCard(b, rawProgressMap)!;
      return pa.nextReviewDate - pb.nextReviewDate;
    });

  const unseen = history.filter((t) => progressForWordCard(t, rawProgressMap) === undefined);

  const sessionCards = shuffle([...due, ...unseen].slice(0, 10));

  const progressMap = new Map<string, FlashcardProgress>();
  for (const t of sessionCards) {
    const p = progressForWordCard(t, rawProgressMap);
    if (p) {
      progressMap.set(t.id, normalizeProgressForCard(p, t));
    }
  }
  return { sessionCards, progressMap };
}
