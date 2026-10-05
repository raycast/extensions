export interface TTSOptions {
  model: MimoTTSModel;
  voice: string;
  stylePrompt?: string;
  openingStyleTags?: string[];
  audioEventTags?: string[];
  format: string;
  playbackRate: number;
  tokenPlanBaseUrl?: string;
}

export interface TTSOptionOverrides {
  speechRate?: string;
  baseStylePrompt?: string;
  additionalStylePrompt?: string;
  openingStyleTags?: string[];
  audioEventTags?: string[];
}

export type MimoTTSModel = "mimo-v2.5-tts" | "mimo-v2-tts";

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  language: string;
  description: string;
  models: MimoTTSModel[];
  recommended?: boolean;
}
