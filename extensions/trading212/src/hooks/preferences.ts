import { getPreferenceValues } from "@raycast/api";
import type { Environment } from "../lib/t212/types";

export interface Prefs {
  apiKey: string;
  apiSecret: string;
  environment: Environment;
  menuBarShowAmount: boolean;
}

export function getPrefs(): Prefs {
  const prefs = getPreferenceValues<Preferences>();
  return {
    apiKey: prefs.apiKey.trim(),
    apiSecret: prefs.apiSecret.trim(),
    environment: prefs.environment === "demo" ? "demo" : "live",
    menuBarShowAmount: prefs.menuBarShowAmount,
  };
}
