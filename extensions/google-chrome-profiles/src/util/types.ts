export type GoogleChromeLocalState = {
  profile: { info_cache: GoogleChromeInfoCache };
};

export type GoogleChromeInfoCache = { [key: string]: GoogleChromeInfoCacheProfile };

export type GoogleChromeInfoCacheProfile = {
  /**
   * The chrome avatar path; eg: `chrome://theme/IDR_PROFILE_AVATAR_44`.
   */
  avatar_icon: string;
  /**
   * The profile name, written by the User in the create Chrome profile tutorial window. Eg: Personal, Work, Kids.
   */
  name: string;
  /**
   * The user Google account profile picture URL (if any).
   */
  last_downloaded_gaia_picture_url_with_size?: string;
  /**
   * The name of the user Google account, eg: `Steve Jobs`.
   */
  gaia_name?: string;
  /**
   * The email of the user Google account, eg: `steve.jobs@gmail.com`.
   */
  user_name?: string;
};

export type Profile = {
  /**
   * The profile name given in Google Chrome.
   */
  name: string;
  /**
   * The folder name where the Chrome profile is stored.
   */
  directory: string;
  /**
   * The Google Account if the user has sync the profile with a google account.
   */
  ga?: {
    /**
     * The GA user name.
     */
    name: string;
    /**
     * The GA user email.
     */
    email: string;
    /**
     * The GA user profile picture URL.
     */
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

export interface Preferences {
  newBlankTabURL: string;
  newTabURL: string;
}
