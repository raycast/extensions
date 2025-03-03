import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://1bookmark.net/";

// apiUrl is not used in production environment. So in production, DEFAULT_API_URL is used.
export const API_URL = (getPreferenceValues().apiUrl as string) || DEFAULT_API_URL;
export const API_URL_TRPC = new URL("/api/trpc", API_URL).toString();
export const API_URL_SIGNIN = new URL("/api/raycast-login", API_URL).toString();
