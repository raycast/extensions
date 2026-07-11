export interface BookmarkItem {
  id: string;
  url: string;
  title: string;
  createdAt: number;
  lastAccessedAt: number;
}

export interface BookmarkStorage {
  [key: string]: BookmarkItem;
}
