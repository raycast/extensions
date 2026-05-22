import type { TextReplacement } from "./types";

export function replacementSearchKeywords(
  replacement: TextReplacement,
): string[] {
  return uniqueKeywords([replacement.replacementText, ...replacement.tags]);
}

function uniqueKeywords(values: string[]): string[] {
  const seen = new Set<string>();
  const keywords: string[] = [];

  for (const value of values) {
    const keyword = value.trim();
    const key = keyword.toLocaleLowerCase();

    if (!keyword || seen.has(key)) {
      continue;
    }

    seen.add(key);
    keywords.push(keyword);
  }

  return keywords;
}
