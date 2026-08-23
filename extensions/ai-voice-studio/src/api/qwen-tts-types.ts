export type QwenTTSModel = "qwen3-tts-flash" | "qwen3-tts-instruct-flash" | "qwen-tts-latest" | "qwen-tts";

export type QwenTTSFormat = "wav";

export type QwenTTSRegion = "beijing" | "singapore" | "custom";

export type QwenTTSLanguageType =
  | "Auto"
  | "Chinese"
  | "English"
  | "German"
  | "Italian"
  | "Portuguese"
  | "Spanish"
  | "Japanese"
  | "Korean"
  | "French"
  | "Russian";

export interface TTSOptions {
  model: QwenTTSModel;
  voice: string;
  format: QwenTTSFormat;
  region: QwenTTSRegion;
  languageType: QwenTTSLanguageType;
  baseUrl: string;
  playbackRate: number;
  instructions?: string;
  optimizeInstructions?: boolean;
}

export interface TTSOptionOverrides {
  languageType?: QwenTTSLanguageType;
}

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  description: string;
  language: string;
  models: QwenTTSModel[];
  recommended?: boolean;
}
