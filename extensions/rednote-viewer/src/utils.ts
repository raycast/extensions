import { AI, environment, getPreferenceValues } from "@raycast/api";
import { BASE_URL } from "./constants.js";

export const { translateToEnglish } = getPreferenceValues<ExtensionPreferences>();
export const canAccessAI = environment.canAccess(AI);
export const shouldTranslate = canAccessAI && translateToEnglish;

export function parseUrl(url: string) {
  try {
    const uri = new URL(url);

    const host = uri.host;
    const path = uri.pathname;
    const query = uri.search;
    const params = new URLSearchParams(query);
    const noteId = path.split("/").pop() || "";
    const xToken = params.get("xsec_token") || "";

    if (host !== new URL(BASE_URL).host) {
      return null;
    }

    if (!path.includes("/explore")) {
      return null;
    }

    if (!noteId || !xToken) {
      return null;
    }

    return { noteId, xToken };
  } catch {
    return null;
  }
}

export function ellipsis(text: string, maxLength = 15) {
  if (text.length > maxLength) {
    return text.slice(0, maxLength) + "…";
  }
  return text;
}
