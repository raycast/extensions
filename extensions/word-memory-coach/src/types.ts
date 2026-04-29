export type CaptureSource = "clipboard" | "clipboard-history";

export interface WordEntry {
  word: string;
  count: number;
  firstSeenAt: string;
  lastSeenAt: string;
  sources: CaptureSource[];
}

export interface DailyWordLog {
  date: string;
  updatedAt: string;
  words: WordEntry[];
}

export interface CaptureResult {
  addedWords: string[];
  updatedWords: string[];
  ignoredInputs: number;
  totalWordsToday: number;
}
