import { endpoints } from "../vendor/twelfth-shared/index";

export { API_ORIGIN, MCP_URL, WEB_ORIGIN, appUrl, askUrl } from "../vendor/twelfth-shared/index";

export const ENDPOINTS = endpoints();

// The Raycast web redirect: the server only registers https redirect URIs for
// public clients, so the app-scheme redirects are refused.
export const REDIRECT_URI = "https://raycast.com/redirect?packageName=Extension";
