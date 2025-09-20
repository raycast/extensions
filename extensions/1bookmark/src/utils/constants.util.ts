import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://1bookmark.net/";

// apiUrl is not used in production environment. So in production, DEFAULT_API_URL is used.
export const API_URL = (getPreferenceValues().apiUrl as string) || DEFAULT_API_URL;
export const API_URL_TRPC = new URL("/api/trpc", API_URL).toString();
export const API_URL_SIGNIN = new URL("/api/raycast-login", API_URL).toString();

export const CACHED_KEY_SESSION_TOKEN = "session-token";
export const CACHED_KEY_ME = "me";
export const CACHED_KEY_MY_BOOKMARKS = "my-bookmarks";
export const CACHED_KEY_MY_TAGS = "my-tags";

export const CACHED_KEY_LOGGING_EMAIL = "logging-email";
export const CACHED_KEY_LOGGING_TOKEN_SENT = "logging-token-sent";

export const CACHED_KEY_RECENT_SELECTED_SPACE = "recent-selected-space";
export const CACHED_KEY_RECENT_SELECTED_TAGS = "recent-selected-tags";

export const CACHED_KEY_DISABLED_SPACE_IDS = "disabled-space-ids";

export const CACHED_KEY_RANKING_ENTRIES = "ranking-entries";

export const CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL = "space-verifying-auth-email";
export const CACHED_KEY_SPACE_AUTH_CODE_SENT = "space-auth-code-sent";
