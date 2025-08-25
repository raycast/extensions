import { LocalStorage } from "@raycast/api";

const FLASHCARDS_KEY = "flashcards";

export interface FlashcardRecord {
  vocabulary: string;
  translation: string;
  lastReviewed?: string;
  proficiency: number;
}

export async function addToFlashcards(vocabulary: string, translation: string): Promise<FlashcardRecord[]> {
  try {
    const existingCards = await getFlashcards();
    const newCard: FlashcardRecord = {
      vocabulary,
      translation,
      proficiency: 0,
    };

    const updatedCards = [...existingCards, newCard];
    await LocalStorage.setItem(FLASHCARDS_KEY, JSON.stringify(updatedCards));
    return updatedCards;
  } catch (error) {
    console.error("Failed to add to flashcards:", error);
    return [];
  }
}

export async function removeFromFlashcards(vocabulary: string): Promise<FlashcardRecord[]> {
  try {
    const existingCards = await getFlashcards();
    const updatedCards = existingCards.filter((card) => card.vocabulary !== vocabulary);
    await LocalStorage.setItem(FLASHCARDS_KEY, JSON.stringify(updatedCards));
    return updatedCards;
  } catch (error) {
    console.error("Failed to remove from flashcards:", error);
    return [];
  }
}

export async function getFlashcards(): Promise<FlashcardRecord[]> {
  try {
    const existingCards = await LocalStorage.getItem(FLASHCARDS_KEY);
    return existingCards ? JSON.parse(existingCards as string) : [];
  } catch (error) {
    console.error("Failed to get flashcards:", error);
    return [];
  }
}
