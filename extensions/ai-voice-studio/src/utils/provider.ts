import { getDefaultProviderSetting } from "./provider-settings";

export type TTSProvider = "qwen" | "minimax" | "mimo" | "openai";

export async function getDefaultProvider(): Promise<TTSProvider> {
  return getDefaultProviderSetting();
}
