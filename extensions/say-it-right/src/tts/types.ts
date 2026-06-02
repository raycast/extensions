import type { TtsProviderName, RawPrefs } from "../llm/config";

export interface TtsConfig {
  provider: TtsProviderName;
  apiKey: string;
  voice: string;
  model: string;
  baseURL?: string;
}

export interface SynthesizeOptions {
  rate: number; // 1.0 = normal speed; < 1 = slower teaching pace
  instructions: string;
}

export interface TtsPrefs extends RawPrefs {
  openaiTtsModel?: string;
  openaiTtsVoice?: string;
  qwenTtsModel?: string;
  qwenTtsVoice?: string;
  geminiTtsModel?: string;
  geminiTtsVoice?: string;
  mimoTtsModel?: string;
  mimoTtsVoice?: string;
  ttsProvider?: "follow-analysis" | TtsProviderName;
  loopCount?: string;
  loopGap?: string;
}
