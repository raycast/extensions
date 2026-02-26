import { LocalStorage } from "@raycast/api";
import { z } from "zod";
import {
  FlashcardProgress,
  FlashcardProgressSchema,
  Translation,
  TranslationSchema,
} from "./types";

const STORAGE_KEY = "vocabuilder-history";

export async function getHistory(): Promise<Translation[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return z.array(TranslationSchema).parse(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveTranslation(t: Translation): Promise<void> {
  const history = await getHistory();
  const updated = [t, ...history.filter((h) => h.word !== t.word)];
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteTranslation(id: string): Promise<void> {
  const history = await getHistory();
  const updated = history.filter((h) => h.id !== id);
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

const FLASHCARD_KEY = "vocabuilder-flashcards";

export async function getFlashcardProgress(): Promise<
  Map<string, FlashcardProgress>
> {
  const raw = await LocalStorage.getItem<string>(FLASHCARD_KEY);
  if (!raw) return new Map();
  try {
    const arr = z.array(FlashcardProgressSchema).parse(JSON.parse(raw));
    return new Map(arr.map((p) => [p.word, p]));
  } catch {
    return new Map();
  }
}

export async function saveFlashcardProgress(
  progress: FlashcardProgress,
): Promise<void> {
  const map = await getFlashcardProgress();
  map.set(progress.word, progress);
  await LocalStorage.setItem(FLASHCARD_KEY, JSON.stringify([...map.values()]));
}

export interface SessionData {
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
