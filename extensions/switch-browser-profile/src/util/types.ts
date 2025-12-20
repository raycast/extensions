export type GoogleChromeLocalState = {
  profile: { info_cache: GoogleChromeInfoCache };
};

export type GoogleChromeInfoCache = { [key: string]: GoogleChromeInfoCacheProfile };

export type GoogleChromeInfoCacheProfile = {
  avatar_icon: string;
  name: string;
  last_downloaded_gaia_picture_url_with_size?: string;
  gaia_name?: string;
  user_name?: string;
};

export type Profile = {
  name: string;
  directory: string;
  ga?: {
    name: string;
    email: string;
    pictureURL: string;
  };
};

type GoogleChromeBookmark = GoogleChromeBookmarkFolder | GoogleChromeBookmarkURL;

export interface GoogleChromeBookmarkURL extends GoogleChromeBookmarkBase {
  type: "url";
  url: string;
}

export interface GoogleChromeBookmarkFolder extends GoogleChromeBookmarkBase {
  type: "folder";
  children: [GoogleChromeBookmark];
}

interface GoogleChromeBookmarkBase {
  name: string;
  date_added: number;
}

export type GoogleChromeBookmarkFile = {
  roots: {
    bookmark_bar: GoogleChromeBookmarkFolder;
    other: GoogleChromeBookmarkFolder;
    synced: GoogleChromeBookmarkFolder;
  };
};

export type BrowserHistory = {
  url: string;
  title: string;
  visitTime: string;
  icon: string;
};

export interface Preferences {
  newBlankTabURL: string;
  newTabURL: string;
}
