import type { Totals } from "./client";

/** 0.623 -> 62; no share (no words yet) -> null. */
export const percent = (share?: number): number | null => (share === undefined ? null : Math.round(share * 100));

export const percentText = (share?: number) => (share === undefined ? "–" : `${percent(share)}%`);

/** 10-cell bar for a share, e.g. "██████░░░░". */
export const bar = (share?: number) => {
  const filled = Math.round((share ?? 0) * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled);
};

export const wordsText = (t: Totals) => `${t.dictatedWords} dictated · ${t.typedWords} typed`;

/** 125 minutes -> "2 h 5 min". */
export function durationText(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  return minutes >= 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${minutes} min`;
}
