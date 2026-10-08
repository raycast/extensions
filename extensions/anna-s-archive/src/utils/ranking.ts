import type { ArchiveItem } from "@/api";
import type { ArchiveFilter } from "@/hooks/use-archive";

export const rankArchiveItems = (items: ArchiveItem[], query: string, filter: ArchiveFilter): ArchiveItem[] => {
  const normalizedQuery = normalizeSearchText(query);

  return items
    .filter((item) => filter === "all" || item.ext.toLowerCase() === filter)
    .map((item, index) => ({
      item,
      index,
      score: scoreArchiveItem(item, normalizedQuery, filter),
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ item }) => item);
};

const scoreArchiveItem = (item: ArchiveItem, normalizedQuery: string, filter: ArchiveFilter): number => {
  const normalizedTitle = normalizeSearchText(item.title);
  const normalizedAuthor = normalizeSearchText(item.author);
  const normalizedLanguage = normalizeSearchText(item.language);
  const sizeMb = parseSizeInMb(item.size);
  let score = 0;

  if (normalizedTitle === normalizedQuery) {
    score += 120;
  } else if (normalizedTitle.startsWith(`${normalizedQuery} `) || normalizedTitle.startsWith(`${normalizedQuery}:`)) {
    score += 85;
  } else if (normalizedTitle.includes(normalizedQuery)) {
    score += 55;
  } else if (normalizedQuery && isSubsequence(normalizedQuery, normalizedTitle)) {
    score += 18;
  }

  if (normalizedAuthor && normalizedAuthor !== "unknown") {
    score += 10;
  }

  if (filter !== "epub" && item.ext.toLowerCase() === "epub") {
    score += 16;
  }

  if (normalizedLanguage === "en" || normalizedLanguage.includes("english")) {
    score += 12;
  }

  if (/book \(fiction\)/i.test(item.type)) {
    score += 12;
  } else if (/book \(non-fiction\)/i.test(item.type)) {
    score -= 8;
  }

  if (typeof sizeMb === "number") {
    if (sizeMb >= 1.5 && sizeMb <= 8) {
      score += 12;
    } else if (sizeMb < 0.6) {
      score -= 6;
    } else if (sizeMb > 25) {
      score -= 8;
    }
  }

  if (/\b(?:saga|series|trilogy|book|vol|volume)\s*0?2\b/i.test(item.title)) {
    score -= 50;
  }

  if (/\b(?:collection|boxed set|bundle|complete series|omnibus)\b/i.test(item.title)) {
    score -= 25;
  }

  return score;
};

const parseSizeInMb = (size: string | undefined): number | undefined => {
  const match = size?.match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb)?$/i);
  if (!match) {
    return undefined;
  }

  const value = Number(match[1]);
  const unit = (match[2] ?? "mb").toLowerCase();
  if (unit === "kb") {
    return value / 1024;
  }

  if (unit === "gb") {
    return value * 1024;
  }

  return value;
};

const normalizeSearchText = (value: string | undefined): string => {
  return (value ?? "")
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const isSubsequence = (needle: string, haystack: string): boolean => {
  let needleIndex = 0;

  for (const character of haystack) {
    if (character === needle[needleIndex]) {
      needleIndex += 1;
    }
  }

  return needleIndex === needle.length;
};
