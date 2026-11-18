import { useState, useEffect, useCallback, useRef } from "react";
import { MdDefinition } from "../types";
import { getRandomCards } from "../utils/flashCardUtils";

interface UseFlashCardsReturn {
  currentCard: MdDefinition | undefined;
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
  isDeckEmpty: boolean;
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
  const isDeckEmpty = hasInitialized && total === 0;
  const progress = `${currentIndex + 1} / ${total}`;

  const shimmerTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (shimmerTimeoutRef.current) {
        clearTimeout(shimmerTimeoutRef.current);
      }
    };
  }, []);

  const shimmer = useCallback((fn: () => void) => {
    if (shimmerTimeoutRef.current) {
      clearTimeout(shimmerTimeoutRef.current);
    }
    setIsShimmering(true);
    shimmerTimeoutRef.current = setTimeout(() => {
      fn();
      setIsShimmering(false);
      shimmerTimeoutRef.current = undefined;
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
      if (updated.length === 0) {
        setCurrentIndex(0);
      } else if (currentIndex >= updated.length) {
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
    isDeckEmpty,
  };
}
