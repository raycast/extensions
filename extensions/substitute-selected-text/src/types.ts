export type HistoryItem = {
  id: string;
  rawInput: string;
  createdAt: number;
};

export type FavoriteItem = {
  id: string;
  rawInput: string;
  order: number;
  createdAt: number;
};

export type FavoriteMoveDirection = "up" | "down";
