import type { MochiDeck } from "./services/mochi-client";

export type HierarchicalDeck = {
  readonly deck: MochiDeck;
  readonly depth: number;
  readonly path: readonly string[];
};

export function hierarchyDecks(decks: readonly MochiDeck[]): readonly HierarchicalDeck[] {
  const decksById = new Map(decks.map((deck) => [deck.id, deck]));
  const childrenByParentId = new Map<string, MochiDeck[]>();
  const roots: MochiDeck[] = [];

  for (const deck of decks) {
    if (!deck.parentId || deck.parentId === deck.id || !decksById.has(deck.parentId)) {
      roots.push(deck);
      continue;
    }
    const children = childrenByParentId.get(deck.parentId) ?? [];
    children.push(deck);
    childrenByParentId.set(deck.parentId, children);
  }

  const result: HierarchicalDeck[] = [];
  const visitedDeckIds = new Set<string>();
  const appendDeck = (deck: MochiDeck, depth: number, path: readonly string[]): void => {
    if (visitedDeckIds.has(deck.id)) {
      return;
    }
    visitedDeckIds.add(deck.id);
    result.push({ deck, depth, path });
    childrenByParentId
      .get(deck.id)
      ?.sort(compareDeckNames)
      .forEach((child) => appendDeck(child, depth + 1, [...path, child.name]));
  };

  roots.sort(compareDeckNames).forEach((deck) => appendDeck(deck, 0, [deck.name]));
  decks
    .filter((deck) => !visitedDeckIds.has(deck.id))
    .sort(compareDeckNames)
    .forEach((deck) => appendDeck(deck, 0, [deck.name]));

  return result;
}

export function formatDeckHierarchyTitle(path: readonly string[]): string {
  return path.join(" → ");
}

function compareDeckNames(left: MochiDeck, right: MochiDeck): number {
  return left.name.localeCompare(right.name);
}
