import { getPreferenceValues } from "@raycast/api";
import { Settings } from "./ipdata";

interface Prefs {
  apiKey?: string;
  endpoint?: string;
}

export function getSettings(): Settings {
  const p = getPreferenceValues<Prefs>();
  return { apiKey: (p.apiKey ?? "").trim(), endpoint: p.endpoint === "eu" ? "eu" : "global" };
}

// Changes whenever a setting that affects responses changes, so caches can be keyed on it.
export function settingsKey(s: Settings): string {
  return s.apiKey ? `key:${s.endpoint}:${s.apiKey.slice(0, 6)}` : "free";
}
