import { getPreferenceValues } from "@raycast/api";

const DEFAULT_API_URL = "https://1bookmark-web-and-server.vercel.app/";

// apiUrl is not used in production environment.
// So we can use Preferences type to get apiUrl.
export const API_URL = getPreferenceValues().apiUrl || DEFAULT_API_URL;
export const API_URL_TRPC = new URL("/api/trpc", API_URL).toString();
export const API_URL_SIGNIN = new URL("/api/raycast-login", API_URL).toString();
