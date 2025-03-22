// Bookmarks

export interface Bookmark {
  URIDictionary: {
    title: string;
  };
  ReadingListNonSync: {
    Title?: string;
  };
  WebBookmarkUUID: string;
  WebBookmarkType: string;
  URLString: string;
  ReadingList: {
    DateAdded: string;
    DateLastViewed?: string;
    PreviewText: string;
  };
  imageURL: string;
}

export interface BookmarkPListResult {
  Title: string;
  Children: [
    {
      Title: string;
      Children: Bookmark[] | BookmarkPListResult;
    },
  ];
}

export interface GeneralBookmark {
  uuid: string;
  url: string;
  domain?: string;
  title: string;
  folder: string;
}

export interface ReadingListBookmark {
  uuid: string;
  url: string;
  domain?: string;
  title: string;
  dateAdded: string;
  dateLastViewed?: string;
  description: string;
}

/**
 * search method in `utils.ts` has been used by many places.\
 * using a loose type can avoid incompatible types.
 */
export interface LooseTab {
  uuid: string;
  title: string;
  url: string;
}

// Tabs
export interface Tab extends LooseTab {
  is_local: boolean;
}

export interface RemoteTab extends Tab {
  device_uuid: string;
  device_name: string;
}

export interface LocalTab extends Tab {
  window_id: number;
  index: number;
}

export interface Device {
  uuid: string;
  name: string;
  tabs: LocalTab[] | RemoteTab[];
}

// History

export interface HistoryItem {
  id: string;
  title?: string;
  url: string;
  lastVisited: string;
}

// Preferences

export type FallbackSearchType = "search" | "searchHistory";
