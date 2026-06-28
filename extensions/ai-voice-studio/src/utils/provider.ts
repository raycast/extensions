import { getDefaultProviderSetting } from "./provider-settings";

export type TTSProvider = "qwen" | "mimo" | "openai";

export async function getDefaultProvider(): Promise<TTSProvider> {
  return getDefaultProviderSetting();
}
