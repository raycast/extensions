import { getDefaultProviderSetting } from "./provider-settings";

export type TTSProvider = "qwen" | "mimo" | "openai" | "minimax";

export async function getDefaultProvider(): Promise<TTSProvider> {
  return getDefaultProviderSetting();
}
