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
  colorStyle: number;
  type: number;
  range: string;
  bookVersion: number;
  style: number;
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
