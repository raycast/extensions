export type OpenAITTSModel = "gpt-4o-mini-tts" | "tts-1" | "tts-1-hd";

export type OpenAIResponseFormat = "mp3" | "wav";

export interface TTSOptions {
  model: OpenAITTSModel;
  voice: string;
  instructions?: string;
  format: OpenAIResponseFormat;
  playbackRate: number;
}

export interface TTSOptionOverrides {
  instructions?: string;
}

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  description: string;
  models: OpenAITTSModel[];
  recommended?: boolean;
}
