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

export interface Preferences {
  newBlankTabURL?: string;
}
