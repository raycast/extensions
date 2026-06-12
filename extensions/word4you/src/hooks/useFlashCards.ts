import { useState, useEffect, useCallback } from "react";
import { MdDefinition } from "../types";
import { getRandomCards } from "../utils/flashCardUtils";

interface UseFlashCardsReturn {
  currentCard: MdDefinition;
  currentIndex: number;
  total: number;
  progress: string;
  isFlipped: boolean;
  isShimmering: boolean;
  handleFlip: () => void;
  handleNext: () => void;
  handlePrev: () => void;
  handleReshuffle: () => void;
  removeCurrentCard: () => void;
}

export function useFlashCards(definitions: MdDefinition[], isLoading: boolean): UseFlashCardsReturn {
  const [cards, setCards] = useState<MdDefinition[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isShimmering, setIsShimmering] = useState(false);

  useEffect(() => {
    if (!isLoading && definitions.length > 0 && !hasInitialized) {
      setCards(getRandomCards(definitions));
      setCurrentIndex(0);
      setIsFlipped(false);
      setHasInitialized(true);
    }
  }, [isLoading, definitions, hasInitialized]);

  const currentCard = cards[currentIndex];
  const total = cards.length;
  const progress = `${currentIndex + 1} / ${total}`;

  const shimmer = useCallback((fn: () => void) => {
    setIsShimmering(true);
    setTimeout(() => {
      fn();
      setIsShimmering(false);
    }, 250);
  }, []);

  const handleFlip = useCallback(() => {
    shimmer(() => setIsFlipped((prev) => !prev));
  }, [shimmer]);

  const handleNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      shimmer(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
      });
    }
  }, [currentIndex, cards.length, shimmer]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      shimmer(() => {
        setCurrentIndex((prev) => prev - 1);
        setIsFlipped(false);
      });
    }
  }, [currentIndex, shimmer]);

  const handleReshuffle = useCallback(() => {
    shimmer(() => {
      setCards(getRandomCards(definitions));
      setCurrentIndex(0);
      setIsFlipped(false);
    });
  }, [definitions, shimmer]);

  const removeCurrentCard = useCallback(() => {
    setCards((prev) => {
      const updated = prev.filter((_, idx) => idx !== currentIndex);
      if (currentIndex >= updated.length && currentIndex > 0) {
        setCurrentIndex(updated.length - 1);
      }
      setIsFlipped(false);
      return updated;
    });
  }, [currentIndex]);

  return {
    currentCard,
    currentIndex,
    total,
    progress,
    isFlipped,
    isShimmering,
    handleFlip,
    handleNext,
    handlePrev,
    handleReshuffle,
    removeCurrentCard,
  };
}
