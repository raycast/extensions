import { getPreferenceValues } from "@raycast/api";

export function getConfig() {
  const prefs = getPreferenceValues<Preferences>();
  let baseUrl = (prefs.baseUrl || "").trim();
  if (!baseUrl) {
    baseUrl = "https://api.mise.work";
  } else if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }

  const parsedBaseUrl = new URL(baseUrl);
  if (parsedBaseUrl.protocol !== "https:") {
    throw new Error("API Base URL must use HTTPS");
  }

  parsedBaseUrl.hash = "";
  parsedBaseUrl.search = "";
  baseUrl = `${parsedBaseUrl.origin}${parsedBaseUrl.pathname.replace(/\/+$/, "")}`;
  return { baseUrl, token: prefs.token };
}

export function getAppHost() {
  const prefs = getPreferenceValues<Preferences>();
  const api = (prefs.baseUrl || "").toLowerCase();
  if (api.includes("convex.site")) {
    return "http://localhost:5173";
  }
  return "https://mise.work";
}
