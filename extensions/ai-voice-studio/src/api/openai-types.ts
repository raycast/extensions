export type OpenAITTSModel = "gpt-4o-mini-tts";

export type OpenAIResponseFormat = "mp3" | "wav" | "opus" | "aac" | "flac";

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

// Steerable dimensions of gpt-4o-mini-tts surfaced as user controls.
// Speed is handled separately via playbackRate, so it is not included here.
export type OpenAITone = "neutral" | "warm" | "authoritative" | "conversational";
export type OpenAIExpressiveness = "restrained" | "moderate" | "expressive";
export type OpenAIDelivery = "standard" | "narration" | "newscast" | "soft";
export type OpenAIAccentFocus = "multilingual" | "english" | "german" | "chinese";

export interface OpenAIStyle {
  tone: OpenAITone;
  expressiveness: OpenAIExpressiveness;
  delivery: OpenAIDelivery;
  accentFocus: OpenAIAccentFocus;
  extraNotes?: string;
}
