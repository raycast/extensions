import { getPreferenceValues } from "@raycast/api";

export type TTSProvider = "minimax" | "mimo";

export function getDefaultProvider(): TTSProvider {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.defaultProvider === "mimo" ? "mimo" : "minimax";
}
