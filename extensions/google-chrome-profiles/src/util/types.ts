import { getPreferenceValues } from "@raycast/api";

export type GoogleChromeLocalState = {
  profile: {
    info_cache: GoogleChromeInfoCache;
    last_active_profiles?: string[];
    last_used?: string;
    profiles_order?: string[];
  };
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
   * The Google account's given (first) name, eg: `Steve`. This — not `name`
   * or `gaia_name` — is what Chrome's Profiles menu bar item actually shows
   * for a signed-in profile: `${gaia_given_name} (${name})`, eg "Steve (Work)".
   */
  gaia_given_name?: string;
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
   * The Google account's given (first) name, eg: `Steve`, if this profile is
   * signed in. Kept separate from `ga` below (rather than nested in it)
   * because it's the one piece needed to match Chrome's Profiles menu bar
   * item — which shows `${givenName} (${profile name})` for a signed-in
   * profile, eg "Steve (Work)", not the profile's own name — and unlike the
   * rest of the account info it's carried across the Quicklink/deeplink
   * command (`open-profile.tsx`), which has no use for the avatar/email.
   */
  givenName?: string;
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
  url?: string; // url can be null (cf. bookmarklet)
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

export interface BrowserConfig {
  readonly appName: string;
  readonly dataPath: string;
  /**
   * The `.app` bundle, passed to `open -a`. Not the inner Mach-O binary:
   * `open` resolves the bundle through Launch Services, which is what makes
   * the browser come to the front and the command return immediately.
   */
  readonly appPath: string;
}

export const BROWSERS: Record<string, BrowserConfig> = {
  chrome: {
    appName: "Google Chrome",
    dataPath: "Library/Application Support/Google/Chrome",
    appPath: "/Applications/Google Chrome.app",
  },
  "chrome-canary": {
    appName: "Google Chrome Canary",
    dataPath: "Library/Application Support/Google/Chrome Canary",
    appPath: "/Applications/Google Chrome Canary.app",
  },
};

export function getSelectedBrowser(): BrowserConfig {
  const { browser } = getPreferenceValues<ExtensionPreferences>();
  return BROWSERS[browser] ?? BROWSERS["chrome"];
}
