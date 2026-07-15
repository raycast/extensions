import { LocalStorage } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Flashcard } from "../types";

const FLASHCARDS_KEY = "grammar-pro-flashcards";

async function loadFlashcards(): Promise<Flashcard[]> {
  const raw = await LocalStorage.getItem<string>(FLASHCARDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Flashcard[];
  } catch {
    return [];
  }
}

async function saveFlashcards(flashcards: Flashcard[]): Promise<void> {
  await LocalStorage.setItem(FLASHCARDS_KEY, JSON.stringify(flashcards));
}

export function useFlashcards() {
  const [data, setData] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFlashcards().then((cards) => {
      setData(cards);
      setIsLoading(false);
    });
  }, []);

  const add = useCallback(async (card: Flashcard) => {
    setData((prev) => {
      const newCard = {
        ...card,
        interval: 0,
        easeFactor: 2.5,
        dueDate: new Date().toISOString(),
      };
      const updated = [newCard, ...prev];
      saveFlashcards(updated);
      return updated;
    });
  }, []);

  const remove = useCallback(async (id: string) => {
    setData((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveFlashcards(updated);
      return updated;
    });
  }, []);

  const updateStats = useCallback(async (id: string, isCorrect: boolean) => {
    setData((prev) => {
      const updated = prev.map((card) => {
        if (card.id === id) {
          let newInterval = card.interval || 0;
          let newEase = card.easeFactor || 2.5;

          if (isCorrect) {
            if (newInterval === 0) newInterval = 1;
            else if (newInterval === 1) newInterval = 6;
            else newInterval = Math.round(newInterval * newEase);
          } else {
            newInterval = 0; // Reset
            newEase = Math.max(1.3, newEase - 0.2); // Decrease ease
          }

          const newDueDate = new Date();
          newDueDate.setDate(
            newDueDate.getDate() + (newInterval === 0 ? 1 : newInterval),
          );

          return {
            ...card,
            correctCount: isCorrect ? card.correctCount + 1 : card.correctCount,
            wrongCount: !isCorrect ? card.wrongCount + 1 : card.wrongCount,
            lastTestedAt: new Date().toISOString(),
            interval: newInterval,
            easeFactor: newEase,
            dueDate: newDueDate.toISOString(),
          };
        }
        return card;
      });
      saveFlashcards(updated);
      return updated;
    });
  }, []);

  const addInsight = useCallback(async (id: string, insight: string) => {
    setData((prev) => {
      const updated = prev.map((card) => {
        if (card.id === id) {
          const newInsights = card.insights
            ? [insight, ...card.insights]
            : [insight];
          return { ...card, insights: newInsights };
        }
        return card;
      });
      saveFlashcards(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(async () => {
    setData([]);
    await saveFlashcards([]);
  }, []);

  return useMemo(
    () => ({ data, isLoading, add, remove, updateStats, addInsight, clear }),
    [data, isLoading, add, remove, updateStats, addInsight, clear],
  );
}
