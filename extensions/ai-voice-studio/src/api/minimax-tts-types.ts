export type MinimaxTTSModel =
  | "speech-2.8-hd"
  | "speech-2.8-turbo"
  | "speech-2.6-hd"
  | "speech-2.6-turbo"
  | "speech-02-hd"
  | "speech-02-turbo";

export type MinimaxTTSFormat = "mp3" | "wav" | "pcm" | "flac";

export type MinimaxLanguageBoost =
  | "auto"
  | "Chinese"
  | "Chinese,Yue"
  | "English"
  | "Spanish"
  | "French"
  | "Portuguese"
  | "German"
  | "Japanese"
  | "Korean"
  | "Italian"
  | "Russian"
  | "Arabic"
  | "Turkish"
  | "Dutch"
  | "Ukrainian"
  | "Vietnamese"
  | "Indonesian"
  | "Thai"
  | "Polish"
  | "Romanian"
  | "Greek"
  | "Czech"
  | "Finnish"
  | "Hindi";

export interface TTSOptions {
  model: MinimaxTTSModel;
  voice: string;
  format: MinimaxTTSFormat;
  playbackRate: number;
  volume: number;
  pitch: number;
  sampleRate: number;
  bitrate: number;
  channel: number;
  languageBoost: MinimaxLanguageBoost;
  englishNormalization: boolean;
  emotion?: string;
  baseUrl: string;
}

export interface TTSOptionOverrides {
  languageBoost?: MinimaxLanguageBoost;
  emotion?: string;
}

export interface VoiceConfig {
  id: string;
  name: string;
  gender: "female" | "male" | "neutral";
  category: string;
  description: string;
  language: string;
  models: MinimaxTTSModel[];
  recommended?: boolean;
}
