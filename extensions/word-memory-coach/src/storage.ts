import { LocalStorage } from "@raycast/api";
import { CaptureResult, CaptureSource, DailyWordLog, WordEntry } from "./types";
import { extractEnglishWords } from "./word-utils";

const STORAGE_PREFIX = "daily-words-v1";

function getDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildStorageKey(dateKey: string): string {
  return `${STORAGE_PREFIX}:${dateKey}`;
}

function emptyLog(dateKey: string): DailyWordLog {
  return {
    date: dateKey,
    updatedAt: new Date().toISOString(),
    words: [],
  };
}

export async function getDailyLog(date = new Date()): Promise<DailyWordLog> {
  const dateKey = getDateKey(date);
  const rawValue = await LocalStorage.getItem<string>(buildStorageKey(dateKey));

  if (!rawValue) {
    return emptyLog(dateKey);
  }

  try {
    const parsed = JSON.parse(rawValue) as DailyWordLog;
    return {
      date: parsed.date ?? dateKey,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      words: Array.isArray(parsed.words) ? parsed.words : [],
    };
  } catch {
    return emptyLog(dateKey);
  }
}

export async function saveDailyLog(log: DailyWordLog): Promise<void> {
  await LocalStorage.setItem(buildStorageKey(log.date), JSON.stringify(log));
}

export async function captureWordsFromTexts(
  texts: Array<string | undefined>,
  source: CaptureSource,
  lowercase = true,
): Promise<CaptureResult> {
  const log = await getDailyLog();
  const wordsByValue = new Map<string, WordEntry>(log.words.map((entry) => [entry.word, entry]));
  const addedWords = new Set<string>();
  const updatedWords = new Set<string>();
  let ignoredInputs = 0;

  for (const text of texts) {
    if (!text?.trim()) {
      ignoredInputs += 1;
      continue;
    }

    const words = extractEnglishWords(text, lowercase);

    if (words.length === 0) {
      ignoredInputs += 1;
      continue;
    }

    for (const word of words) {
      const now = new Date().toISOString();
      const existing = wordsByValue.get(word);

      if (existing) {
        existing.count += 1;
        existing.lastSeenAt = now;
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
        updatedWords.add(word);
      } else {
        wordsByValue.set(word, {
          word,
          count: 1,
          firstSeenAt: now,
          lastSeenAt: now,
          sources: [source],
        });
        addedWords.add(word);
      }
    }
  }

  const nextLog: DailyWordLog = {
    date: log.date,
    updatedAt: new Date().toISOString(),
    words: Array.from(wordsByValue.values()).sort((left, right) => left.word.localeCompare(right.word)),
  };

  await saveDailyLog(nextLog);

  return {
    addedWords: Array.from(addedWords).sort(),
    updatedWords: Array.from(updatedWords).sort(),
    ignoredInputs,
    totalWordsToday: nextLog.words.length,
  };
}
