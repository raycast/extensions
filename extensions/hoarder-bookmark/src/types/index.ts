export interface Preferences {
  host: string;
  apiKey: string;
  showWebsitePreview: boolean;
  language: string;
}

export interface Config {
  host: string;
  apiKey: string;
  showWebsitePreview: boolean;
  language: string;
}

export interface Asset {
  id: string;
  assetType: "screenshot" | "image";
}

export interface Tag {
  id: string;
  name: string;
  numBookmarks: number;
  numBookmarksByAttachedType: {
    ai: number;
    human: number;
  };
  attachedBy?: "ai" | "human";
}

export interface BookmarkContent {
  type: "link" | "text" | "asset";
  url?: string;
  title?: string;
  text?: string;
  assetType?: "image";
  assetId?: string;
  fileName?: string;
  favicon?: string;
  description?: string;
}

export interface Bookmark {
  id: string;
  content: BookmarkContent;
  summary?: string;
  note?: string;
  favourited: boolean;
  archived: boolean;
  createdAt: string;
  assets?: Asset[];
  tags: Tag[];
}

export interface List {
  id: string;
  name: string;
}

export interface ListDetails {
  bookmarks: Bookmark[];
}

export interface ApiResponse<T> {
  lists?: T[];
  tags?: T[];
  bookmarks?: Bookmark[];
  nextCursor?: string | null;
}

export interface GetBookmarksParams {
  cursor?: string;
  favourited?: boolean;
  archived?: boolean;
}
