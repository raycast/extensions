import type {
  FavoriteItem,
  FavoriteMoveDirection,
  HistoryItem,
} from "../types";

function normalizeFavoriteOrder(items: FavoriteItem[]): FavoriteItem[] {
  return items.map((item, index) => ({ ...item, order: index }));
}

export function upsertHistory(
  history: HistoryItem[],
  rawInput: string,
  limit: number,
  now: () => number,
  createId: () => string,
): HistoryItem[] {
  const filtered = history.filter((item) => item.rawInput !== rawInput);
  const next = [{ id: createId(), rawInput, createdAt: now() }, ...filtered];

  if (limit < 1) {
    return [];
  }

  return next.slice(0, limit);
}

export function deleteHistoryItem(
  history: HistoryItem[],
  id: string,
): HistoryItem[] {
  return history.filter((item) => item.id !== id);
}

export function clearHistory(): HistoryItem[] {
  return [];
}

export function addFavorite(
  favorites: FavoriteItem[],
  rawInput: string,
  now: () => number,
  createId: () => string,
): FavoriteItem[] {
  if (favorites.some((item) => item.rawInput === rawInput)) {
    return favorites;
  }

  const next = [
    ...favorites,
    { id: createId(), rawInput, order: favorites.length, createdAt: now() },
  ];
  return normalizeFavoriteOrder(next);
}

export function removeFavorite(
  favorites: FavoriteItem[],
  id: string,
): FavoriteItem[] {
  const next = favorites.filter((item) => item.id !== id);
  return normalizeFavoriteOrder(next);
}

export function moveFavorite(
  favorites: FavoriteItem[],
  id: string,
  direction: FavoriteMoveDirection,
): FavoriteItem[] {
  const currentIndex = favorites.findIndex((item) => item.id === id);
  if (currentIndex < 0) {
    return normalizeFavoriteOrder(favorites);
  }

  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= favorites.length) {
    return normalizeFavoriteOrder(favorites);
  }

  const next = favorites.slice();
  [next[currentIndex], next[targetIndex]] = [
    next[targetIndex],
    next[currentIndex],
  ];
  return normalizeFavoriteOrder(next);
}
