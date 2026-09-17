import { parseMultipleCards } from "./parser";
import { getAllCards, saveCards } from "./storage";
import { Flashcard, Progress } from "../types";

export interface GeneratedCardsResult {
  cards: Flashcard[];
  skipped: number;
}

export async function createCardsFromMarkdown(input: string): Promise<GeneratedCardsResult> {
  const trimmed = input.trim();
  if (!trimmed) {
    return { cards: [], skipped: 0 };
  }

  const parsed = parseMultipleCards(trimmed);
  const now = Date.now();
  const cards: Flashcard[] = parsed.map((card, index) => ({
    ...card,
    id: `${now}-${index}-${crypto.randomUUID()}`,
    progress: "unanswered",
    createdAt: now,
  }));

  if (cards.length > 0) {
    await saveCards(cards);
  }

  return {
    cards,
    skipped: parsed.length === 0 ? 1 : 0,
  };
}

export function searchCards(cards: Flashcard[], query: string, tag?: string): Flashcard[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const normalizedTag = tag?.trim().toLocaleLowerCase();

  return cards.filter((card) => {
    const searchableText = [
      card.front,
      card.back ?? "",
      ...(card.options?.map((option) => option.text) ?? []),
      ...card.tags,
    ]
      .join(" ")
      .toLocaleLowerCase();

    return (
      searchableText.includes(normalizedQuery) &&
      (!normalizedTag || card.tags.some((cardTag) => cardTag.toLocaleLowerCase() === normalizedTag))
    );
  });
}

export function selectStudyCards(cards: Flashcard[], tag?: string, progress?: Progress, limit = 20): Flashcard[] {
  const normalizedTag = tag?.trim().toLocaleLowerCase();
  const filtered = cards.filter(
    (card) =>
      (!normalizedTag || card.tags.some((cardTag) => cardTag.toLocaleLowerCase() === normalizedTag)) &&
      (!progress || card.progress === progress),
  );

  return filtered.slice(0, Math.max(1, Math.floor(limit)));
}

export async function getSearchResults(query: string, tag?: string): Promise<Flashcard[]> {
  return searchCards(await getAllCards(), query, tag);
}

export async function getStudyResults(tag?: string, progress?: Progress, limit?: number): Promise<Flashcard[]> {
  return selectStudyCards(await getAllCards(), tag, progress, limit);
}
