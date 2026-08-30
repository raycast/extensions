import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://1bookmark.net/";

// apiUrl is not used in production environment. So in production, DEFAULT_API_URL is used.
export const API_URL = (getPreferenceValues().apiUrl as string) || DEFAULT_API_URL;
export const API_URL_TRPC = new URL("/api/trpc", API_URL).toString();

export const CACHED_KEY_SESSION_TOKEN = "session-token";
export const CACHED_KEY_ME = "me";
export const CACHED_KEY_MY_BOOKMARKS = "my-bookmarks";
// Schema version of the bookmark cache (CACHED_KEY_MY_BOOKMARKS). Bump it whenever the shape of the
// cached data changes. A cache with a different version is ignored and refetched from the server;
// the bare-array cache written by 0.13.x and earlier is migrated (see use-bookmarks.hook).
export const MY_BOOKMARKS_CACHE_SCHEMA_VERSION = 1;
export const CACHED_KEY_MY_TAGS = "my-tags";
// Email of the last logged-in user. Used to reset local-only user preference caches
// (disabled-space-ids, etc.) only when a different user logs in.
export const CACHED_KEY_LAST_LOGGED_IN_EMAIL = "last-logged-in-email";

export const CACHED_KEY_RECENT_SELECTED_SPACE = "recent-selected-space";
export const CACHED_KEY_RECENT_SELECTED_TAGS = "recent-selected-tags";

export const CACHED_KEY_DISABLED_SPACE_IDS = "disabled-space-ids";

export const CACHED_KEY_RANKING_ENTRIES = "ranking-entries";

export const CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL = "space-verifying-auth-email";
export const CACHED_KEY_SPACE_AUTH_CODE_SENT = "space-auth-code-sent";

// Toggle state of the bookmark list detail panel (search view only).
export const CACHED_KEY_SHOWING_DETAIL = "bookmark-showing-detail";
