// Bookmarks

interface Bookmark {
  URIDictionary: {
    title: string;
  };
  ReadingListNonSync: {
    Title: string;
  };
  WebBookmarkUUID: string;
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
      Children: Bookmark[];
    }
  ];
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

// Tabs

export interface Tab {
  uuid: string;
  title: string;
  url: string;
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
