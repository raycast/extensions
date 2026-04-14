import { getChoseong } from "es-hangul";
import Fuse from "fuse.js";
import type { HistoryEntry } from "../types";

const CHOSEONG_REGEX = /^[ㄱ-ㅎ\s]+$/;

function isAllChoseong(text: string): boolean {
  const stripped = text.replace(/\s/g, "");
  return stripped.length > 0 && CHOSEONG_REGEX.test(text);
}

export function searchHistory(
  entries: HistoryEntry[],
  query: string,
): HistoryEntry[] {
  const trimmed = query.trim();
  if (!trimmed) return entries;

  const lowerQuery = trimmed.toLowerCase();

  // 1. Exact includes
  const exactMatches = entries.filter(
    (e) =>
      e.originalText.toLowerCase().includes(lowerQuery) ||
      e.resultText.toLowerCase().includes(lowerQuery) ||
      e.commandLabel.toLowerCase().includes(lowerQuery),
  );
  if (exactMatches.length > 0) return exactMatches;

  // 2. Choseong search
  if (isAllChoseong(trimmed)) {
    const choseongQuery = trimmed.replace(/\s/g, "");
    const choseongMatches = entries.filter(
      (e) =>
        getChoseong(e.originalText).includes(choseongQuery) ||
        getChoseong(e.resultText).includes(choseongQuery) ||
        getChoseong(e.commandLabel).includes(choseongQuery),
    );
    if (choseongMatches.length > 0) return choseongMatches;
  }

  // 3. Fuzzy search
  const fuse = new Fuse(entries, {
    keys: ["originalText", "resultText", "commandLabel"],
    threshold: 0.4,
  });
  return fuse.search(trimmed).map((r) => r.item);
}
