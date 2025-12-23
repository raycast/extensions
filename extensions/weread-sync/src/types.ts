// Enums for WeRead bookmark properties
export enum BookmarkColorStyle {
  YELLOW = 0,
  RED = 1,
  BLUE = 2,
  GREEN = 3,
  PURPLE = 4,
}

export enum BookmarkType {
  HIGHLIGHT = 0,
  NOTE = 1,
  THOUGHT = 2,
}

export enum BookmarkStyle {
  NORMAL = 0,
  UNDERLINE = 1,
  BOLD = 2,
}

export enum BookVersion {
  ORIGINAL = 0,
  UPDATED_V1 = 1,
  UPDATED_V2 = 2,
}

export interface WeReadBook {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  noteCount: number;
}

export interface WeReadBookmark {
  bookmarkId: string;
  chapterUid: number;
  chapterTitle?: string; // Will be filled from chapters array
  chapterIdx?: number; // Will be filled from chapters array
  markText: string;
  createTime: number;
  colorStyle: BookmarkColorStyle;
  type: BookmarkType;
  range: string;
  bookVersion: BookVersion;
  style: BookmarkStyle;
}

export interface WeReadThought {
  reviewId: string;
  bookId: string;
  chapterUid: number;
  chapterTitle: string;
  chapterIdx: number;
  abstract: string;
  content: string;
  createTime: number;
  review: {
    reviewId: string;
    content: string;
  };
}

export interface ReadwiseHighlight {
  text: string;
  title: string;
  author: string;
  note?: string;
  highlighted_at?: string;
  location?: number;
  location_type?: string;
}

export interface SyncStatus {
  bookId: string;
  lastSyncTime: number;
  syncedBookmarkIds: string[];
}

export interface AppState {
  wereadCookie?: string;
  readwiseToken?: string;
  syncStatuses: { [bookId: string]: SyncStatus };
}
