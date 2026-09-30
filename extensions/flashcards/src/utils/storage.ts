import { LocalStorage } from "@raycast/api";
import { Flashcard } from "../types";

const CARDS_KEY = "flashcards_v1";

export async function getAllCards(): Promise<Flashcard[]> {
  try {
    const data = await LocalStorage.getItem<string>(CARDS_KEY);
    if (!data) return [];
    return JSON.parse(data) as Flashcard[];
  } catch {
    return [];
  }
}

export async function saveCard(card: Flashcard): Promise<void> {
  await saveCards([card]);
}

export async function saveCards(cards: Flashcard[]): Promise<void> {
  const existingCards = await getAllCards();
  for (const card of cards) {
    const idx = existingCards.findIndex((existing) => existing.id === card.id);
    if (idx >= 0) {
      existingCards[idx] = card;
    } else {
      existingCards.push(card);
    }
  }
  await LocalStorage.setItem(CARDS_KEY, JSON.stringify(existingCards));
}

export async function deleteCard(id: string): Promise<void> {
  const cards = await getAllCards();
  await LocalStorage.setItem(CARDS_KEY, JSON.stringify(cards.filter((c) => c.id !== id)));
}

/** Delete all stored flashcards. */
export async function deleteAllCards(): Promise<void> {
  await LocalStorage.setItem(CARDS_KEY, JSON.stringify([]));
}

export async function updateProgress(id: string, progress: "correct" | "wrong"): Promise<void> {
  const cards = await getAllCards();
  const card = cards.find((c) => c.id === id);
  if (card) {
    card.progress = progress;
    await LocalStorage.setItem(CARDS_KEY, JSON.stringify(cards));
  }
}

export async function resetProgress(): Promise<void> {
  const cards = await getAllCards();
  const reset = cards.map((c) => ({ ...c, progress: "unanswered" as const }));
  await LocalStorage.setItem(CARDS_KEY, JSON.stringify(reset));
}

export async function getAllTags(): Promise<string[]> {
  const cards = await getAllCards();
  const tagSet = new Set<string>();
  for (const card of cards) {
    card.tags.forEach((t) => tagSet.add(t));
  }
  return Array.from(tagSet).sort();
}
