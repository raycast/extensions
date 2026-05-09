import { getDefaultProviderSetting } from "./provider-settings";

export type TTSProvider = "minimax" | "mimo" | "openai";

export async function getDefaultProvider(): Promise<TTSProvider> {
  return getDefaultProviderSetting();
}
