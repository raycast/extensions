import { getPreferenceValues } from "@raycast/api";

export function getConfig() {
  const prefs = getPreferenceValues<{ baseUrl?: string; token: string }>();
  let baseUrl = (prefs.baseUrl || "").trim();
  if (!baseUrl) {
    baseUrl = "https://api.mise.work";
  } else if (!/^https?:\/\//i.test(baseUrl)) {
    baseUrl = `https://${baseUrl}`;
  }
  baseUrl = baseUrl.replace(/\/+$/, "");
  return { baseUrl, token: prefs.token };
}

export function getAppHost() {
  const prefs = getPreferenceValues<{ baseUrl?: string; token: string }>();
  const api = (prefs.baseUrl || "").toLowerCase();
  if (api.includes("convex.site")) {
    return "http://localhost:5173";
  }
  return "https://mise.work";
}
