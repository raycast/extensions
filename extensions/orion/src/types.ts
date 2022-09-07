// Bookmarks and Reading List

export type OrionFavoritesPlistResult = [{ [key: string]: OrionFavoriteItem }];
export type OrionReadingListPlistResult = [OrionReadingListItem[]];

export interface OrionFavoriteItem {
  parentId: string;
  unmodifiable: string;
  id: string;
  title: string;
  dateAdded: number;
  type: string;
  index: number;
  url?: string;
}

export interface OrionReadingListItem {
  id: string;
  title: string;
  description: string;
  dateAdded: number;
  index: number;
  imageUrl?: { relative: string };
  url: { relative: string };
  referrer: { relative: string };
}

export interface Bookmark {
  uuid: string;
  title: string;
  url: string;
  folders: string[];
  dateAdded: number;
  imageUrl?: string;
}

// History

export interface HistoryItem {
  id: string;
  title?: string;
  url: string;
  lastVisitTime: string;
  lastVisitDate: string;
}
