import type { RaycastCard } from "./api";
import { isDone } from "./doneStates";

const sortByCreatedAtDesc = (cards: RaycastCard[]): RaycastCard[] =>
  [...cards].sort((left, right) => right.createdAt - left.createdAt);

export interface UpsertOptions {
  /** The list shows archived cards only (true) or leaves them out (false). */
  archivedView?: boolean;
  /** The list shows done links only, or links still to do. */
  doneView?: "done" | "todo";
  /** Where a card that comes back goes, so Undo keeps a shuffled or closest-first order. */
  insertIndex?: number;
  /** Hidden cards stay out of a list unless the search names a hidden tag. */
  removeWhenHidden?: boolean;
  removeWhenUnfavorited?: boolean;
}

export const upsertCard = (
  cards: RaycastCard[],
  next: RaycastCard,
  options?: UpsertOptions,
): RaycastCard[] => {
  if (
    (options?.removeWhenUnfavorited && !next.isFavorited) ||
    (options?.removeWhenHidden && next.isHidden) ||
    (options?.archivedView !== undefined &&
      Boolean(next.isArchived) !== options.archivedView) ||
    (options?.doneView !== undefined &&
      isDone(next) !== (options.doneView === "done"))
  ) {
    return cards.filter((card) => card.id !== next.id);
  }

  const index = cards.findIndex((card) => card.id === next.id);
  if (index === -1) {
    if (options?.insertIndex !== undefined) {
      const at = Math.min(Math.max(options.insertIndex, 0), cards.length);
      return [...cards.slice(0, at), next, ...cards.slice(at)];
    }
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

export const toTagQuery = (tag: string): string => tag.trim();
