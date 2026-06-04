import type { RaycastCard } from "./api";

const sortByCreatedAtDesc = (cards: RaycastCard[]): RaycastCard[] => {
  return [...cards].sort((left, right) => right.createdAt - left.createdAt);
};

export const upsertCard = (
  cards: RaycastCard[],
  next: RaycastCard,
  options?: {
    removeWhenUnfavorited?: boolean;
  },
): RaycastCard[] => {
  if (options?.removeWhenUnfavorited && !next.isFavorited) {
    return cards.filter((card) => card.id !== next.id);
  }

  const index = cards.findIndex((card) => card.id === next.id);
  if (index === -1) {
    return sortByCreatedAtDesc([...cards, next]);
  }

  const updated = [...cards];
  updated[index] = next;
  return updated;
};

export const removeCardById = (
  cards: RaycastCard[],
  cardId: string,
): {
  cards: RaycastCard[];
  removedCard: RaycastCard | null;
} => {
  const index = cards.findIndex((card) => card.id === cardId);
  if (index === -1) {
    return { cards, removedCard: null };
  }

  return {
    cards: cards.filter((card) => card.id !== cardId),
    removedCard: cards[index] ?? null,
  };
};

export const toTagQuery = (tag: string): string => {
  return tag.trim();
};
