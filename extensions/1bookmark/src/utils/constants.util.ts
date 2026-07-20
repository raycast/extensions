import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://1bookmark.net/";

// apiUrl is not used in production environment. So in production, DEFAULT_API_URL is used.
export const API_URL = (getPreferenceValues().apiUrl as string) || DEFAULT_API_URL;
export const API_URL_TRPC = new URL("/api/trpc", API_URL).toString();

export const CACHED_KEY_SESSION_TOKEN = "session-token";
export const CACHED_KEY_ME = "me";
export const CACHED_KEY_MY_BOOKMARKS = "my-bookmarks";
export const CACHED_KEY_MY_TAGS = "my-tags";
// 마지막으로 로그인했던 사용자 이메일. 다른 사용자가 로그인할 때만
// 로컬 전용 사용자 선호 캐시(disabled-space-ids 등)를 초기화하는 데 쓴다.
export const CACHED_KEY_LAST_LOGGED_IN_EMAIL = "last-logged-in-email";

export const CACHED_KEY_RECENT_SELECTED_SPACE = "recent-selected-space";
export const CACHED_KEY_RECENT_SELECTED_TAGS = "recent-selected-tags";

export const CACHED_KEY_DISABLED_SPACE_IDS = "disabled-space-ids";

export const CACHED_KEY_RANKING_ENTRIES = "ranking-entries";

export const CACHED_KEY_SPACE_VERIFYING_AUTH_EMAIL = "space-verifying-auth-email";
export const CACHED_KEY_SPACE_AUTH_CODE_SENT = "space-auth-code-sent";

// 북마크 리스트 상세 패널 토글 상태 (검색 뷰 전용).
export const CACHED_KEY_SHOWING_DETAIL = "bookmark-showing-detail";
