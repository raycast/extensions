import { getPreferenceValues } from "@raycast/api";

export type TTSProvider = "minimax" | "mimo" | "openai";

export function getDefaultProvider(): TTSProvider {
  const prefs = getPreferenceValues<Preferences>();
  if (prefs.defaultProvider === "openai") return "openai";
  return prefs.defaultProvider === "mimo" ? "mimo" : "minimax";
}
