import type { PromptRecord } from "../types/snapshot.js";

// Case folding uses toLowerCase so results never vary with the host locale.
export function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function searchPrompts(prompts: PromptRecord[], query: string): PromptRecord[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  if (!normalizedQuery) {
    return prompts;
  }

  return prompts
    .filter((prompt) => searchableText(prompt).includes(normalizedQuery))
    .sort((left, right) => searchRelevance(left, normalizedQuery) - searchRelevance(right, normalizedQuery));
}

export function searchRelevance(prompt: PromptRecord, normalizedQuery: string): number {
  const title = normalizeSearchText(prompt.title);
  if (title === normalizedQuery) return 0;
  if (title.startsWith(normalizedQuery)) return 1;
  if (title.includes(normalizedQuery)) return 2;

  const category = normalizeSearchText(prompt.category?.name ?? "");
  if (category.includes(normalizedQuery)) return 3;
  return 4;
}

export function comparePromptFallback(left: PromptRecord, right: PromptRecord): number {
  return (
    compareOptionalDatesDescending(left.lastUsedAt, right.lastUsedAt) ||
    compareOptionalDatesDescending(left.updatedAt, right.updatedAt) ||
    left.title.localeCompare(right.title, undefined, { sensitivity: "base" }) ||
    left.id.localeCompare(right.id)
  );
}

export function applyPrimaryOrdering(promptsInFrecencyOrder: PromptRecord[], query: string): PromptRecord[] {
  const normalizedQuery = normalizeSearchText(query.trim());
  return [...promptsInFrecencyOrder].sort((left, right) => {
    if (normalizedQuery) {
      return searchRelevance(left, normalizedQuery) - searchRelevance(right, normalizedQuery);
    }
    return Number(right.isFavorite) - Number(left.isFavorite);
  });
}

export function promptFrecencyKey(prompt: PromptRecord): string {
  return prompt.id;
}

function searchableText(prompt: PromptRecord): string {
  return normalizeSearchText([prompt.title, prompt.content, prompt.category?.name ?? ""].join("\n"));
}

function compareOptionalDatesDescending(left?: string, right?: string): number {
  const leftTime = left ? Date.parse(left) : Number.NEGATIVE_INFINITY;
  const rightTime = right ? Date.parse(right) : Number.NEGATIVE_INFINITY;
  return rightTime - leftTime;
}
