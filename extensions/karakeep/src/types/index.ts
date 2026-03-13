// Action types
export type linkMainActionType = "openInBrowser" | "viewDetail" | "edit" | "copy";
export type textMainActionType = "viewDetail" | "edit" | "copy";

// Common display preferences for internal use
interface DisplayOptions {
  displayBookmarkPreview: boolean;
  displayTags: boolean;
  displayCreatedAt: boolean;
  displayDescription: boolean;
  displayNote: boolean;
  displayBookmarkStatus: boolean;
  displaySummary: boolean;
}

// Base configuration options for internal use
interface BaseConfig {
  apiUrl: string;
  apiKey: string;
  language: string;
  showWebsitePreview: boolean;
  linkMainAction: linkMainActionType;
  textMainAction: textMainActionType;
  prefillUrlFromBrowser: boolean;
}

export interface Preferences extends Partial<DisplayOptions> {
  apiUrl: string;
  apiKey: string;
  language?: string;
  showWebsitePreview: boolean;
  linkMainAction?: linkMainActionType;
  textMainAction?: textMainActionType;
  prefillUrlFromBrowser?: boolean;
}

export interface Config extends BaseConfig, DisplayOptions {}

// Asset types
export interface Asset {
  id: string;
  assetType?: "screenshot" | "image" | "pdf";
}

// Tag related types
type AttachmentSource = "ai" | "human";

interface TagMetrics {
  numBookmarks: number;
  numBookmarksByAttachedType: {
    ai: number;
    human: number;
  };
}

export interface Tag extends TagMetrics {
  id: string;
  name: string;
  attachedBy?: AttachmentSource;
}

// Bookmark content types
interface BaseContent {
  title?: string;
  description?: string;
}

export interface BookmarkContent extends BaseContent {
  type: "link" | "text" | "asset";
  url?: string;
  text?: string;
  assetType?: Asset["assetType"];
  assetId?: string;
  fileName?: string;
  favicon?: string;
}

export interface Bookmark {
  id: string;
  title?: string;
  content: BookmarkContent;
  summary?: string;
  note?: string;
  favourited: boolean;
  archived: boolean;
  createdAt: string;
  assets?: Asset[];
  tags: Tag[];
  taggingStatus?: "pending" | "success" | "failure" | null;
}

export type ListType = "manual" | "smart";

export interface List {
  id: string;
  name: string;
  icon?: string;
  parentId?: string | null;
  type?: ListType;
  description?: string;
  query?: string;
}

export interface ListDetails {
  bookmarks: Bookmark[];
}

export interface ApiResponse<T extends List | Tag | Bookmark | Highlight = List | Tag | Bookmark | Highlight> {
  lists?: T[];
  tags?: T[];
  bookmarks?: Bookmark[];
  highlights?: Highlight[];
  nextCursor?: string | null;
}

export interface GetBookmarksParams {
  cursor?: string;
  favourited?: boolean;
  archived?: boolean;
  type?: "link" | "text" | "asset";
  limit?: number;
}

export interface Highlight {
  id: string;
  bookmarkId: string;
  text: string;
  startOffset: number;
  endOffset: number;
  note?: string;
  color?: string;
  createdAt?: string;
}

export interface Backup {
  id: string;
  createdAt: string;
  size?: number;
  status?: string;
}

export interface UserStats {
  numBookmarks: number;
  numFavorites: number;
  numArchived: number;
  numTags: number;
  numLists: number;
  numHighlights: number;
  bookmarksByType: {
    link: number;
    text: number;
    asset: number;
  };
  topDomains: Array<{ domain: string; count: number }>;
  totalAssetSize: number;
  assetsByType: Array<{ type: string; count: number; totalSize: number }>;
  bookmarkingActivity: {
    thisWeek: number;
    thisMonth: number;
    thisYear: number;
    byHour: Array<{ hour: number; count: number }>;
    byDayOfWeek: Array<{ day: number; count: number }>;
  };
  tagUsage: Array<{ name: string; count: number }>;
  bookmarksBySource: Array<{ source: string | null; count: number }>;
}
