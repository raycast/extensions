import { describe, it, expect, vi, beforeEach } from "vitest";
import { LocalStorage } from "@raycast/api";
import { getHistory, saveTranslation, deleteTranslation, clearHistory, getSessionCards } from "./storage";
import type { LanguagePair } from "./languages";
import type { Translation } from "./types";

const pair: LanguagePair = {
  source: { code: "en", name: "English" },
  target: { code: "uk", name: "Ukrainian" },
};

const HISTORY_KEY = "vocabuilder-history-en-uk";

function makeTranslation(overrides: Partial<Translation> = {}): Translation {
  return {
    id: "id-1",
    word: "hello",
    translation: "привіт",
    partOfSpeech: "interjection",
    example: "Hello!",
    exampleTranslation: "Привіт!",
    timestamp: Date.now(),
    type: "word",
    ...overrides,
  };
}

beforeEach(() => {
  // Clear the in-memory store between tests
  (LocalStorage as unknown as { _store: Map<string, string> })._store.clear();
  vi.clearAllMocks();
});

describe("getHistory", () => {
  it("returns empty array when no data stored", async () => {
    const history = await getHistory(pair);
    expect(history).toEqual([]);
  });

  it("returns parsed translations from storage", async () => {
    const t = makeTranslation();
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify([t]));
    const history = await getHistory(pair);
    expect(history).toHaveLength(1);
    expect(history[0].word).toBe("hello");
  });

  it("returns empty array and backs up corrupted data", async () => {
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, "not valid json!!!");
    const history = await getHistory(pair);
    expect(history).toEqual([]);
    // Verify backup was created
    expect(LocalStorage.setItem).toHaveBeenCalledWith(`${HISTORY_KEY}-corrupt-backup`, "not valid json!!!");
  });
});

describe("saveTranslation", () => {
  it("saves a new translation", async () => {
    const t = makeTranslation();
    const result = await saveTranslation(t, pair);
    expect(result).toBe(true);

    const stored = (LocalStorage as unknown as { _store: Map<string, string> })._store.get(HISTORY_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].word).toBe("hello");
  });

  it("deduplicates by word — keeps newest at front", async () => {
    const old = makeTranslation({ id: "id-old", timestamp: 1000 });
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify([old]));

    const updated = makeTranslation({ id: "id-new", timestamp: 2000 });
    await saveTranslation(updated, pair);

    const stored = (LocalStorage as unknown as { _store: Map<string, string> })._store.get(HISTORY_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe("id-new");
  });

  it("returns false when storage is corrupted", async () => {
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, "corrupted");
    const result = await saveTranslation(makeTranslation(), pair);
    expect(result).toBe(false);
  });
});

describe("deleteTranslation", () => {
  it("removes translation by id", async () => {
    const t = makeTranslation();
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify([t]));

    await deleteTranslation("id-1", pair);

    const stored = (LocalStorage as unknown as { _store: Map<string, string> })._store.get(HISTORY_KEY);
    expect(JSON.parse(stored!)).toHaveLength(0);
  });
});

describe("clearHistory", () => {
  it("removes the history key entirely", async () => {
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(
      HISTORY_KEY,
      JSON.stringify([makeTranslation()]),
    );

    await clearHistory(pair);

    expect(LocalStorage.removeItem).toHaveBeenCalledWith(HISTORY_KEY);
  });
});

describe("getSessionCards", () => {
  it("filters out text-type translations", async () => {
    const word = makeTranslation({ id: "w1", word: "word1", type: "word" });
    const text = makeTranslation({ id: "t1", word: "text1", type: "text" });
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify([word, text]));

    const { sessionCards } = await getSessionCards(pair);
    expect(sessionCards.every((c) => c.type !== "text")).toBe(true);
  });

  it("caps at 10 cards", async () => {
    const translations = Array.from({ length: 15 }, (_, i) => makeTranslation({ id: `id-${i}`, word: `word${i}` }));
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify(translations));

    const { sessionCards } = await getSessionCards(pair);
    expect(sessionCards.length).toBeLessThanOrEqual(10);
  });

  it("includes due cards based on nextReviewDate", async () => {
    const t = makeTranslation({ id: "w1", word: "review-me" });
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(HISTORY_KEY, JSON.stringify([t]));

    const progress = [
      {
        word: "review-me",
        easeFactor: 2.5,
        interval: 1,
        repetitions: 1,
        nextReviewDate: Date.now() - 1000, // overdue
      },
    ];
    (LocalStorage as unknown as { _store: Map<string, string> })._store.set(
      "vocabuilder-flashcards-en-uk",
      JSON.stringify(progress),
    );

    const { sessionCards } = await getSessionCards(pair);
    expect(sessionCards.some((c) => c.word === "review-me")).toBe(true);
  });
});
