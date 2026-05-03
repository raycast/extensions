export type GeminiTTSModel = "gemini-3.1-flash-tts-preview" | "gemini-2.5-flash-preview-tts";
export type GeminiLanguageMode = "auto" | "cmn" | "en" | "mixed-cmn-en";
export type GeminiReadingExperience =
  | "auto"
  | "academic-bilingual"
  | "legal-text"
  | "mandarin-lecture"
  | "english-paper"
  | "news-briefing"
  | "audiobook"
  | "neutral";
export type GeminiExpressiveness = "subtle" | "balanced" | "expressive";
export type GeminiAudioTagMode = "off" | "preserve" | "paragraph-pauses" | "smart-pauses";

export interface GeminiTTSRequest {
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    responseModalities: ["AUDIO"];
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
    };
  };
}

export interface GeminiTTSResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          mimeType?: string;
          data?: string;
        };
        text?: string;
      }>;
    };
  }>;
  promptFeedback?: {
    blockReason?: string;
    blockReasonMessage?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
}

export interface TTSOptions {
  voiceId: string;
  model: GeminiTTSModel;
  languageMode: GeminiLanguageMode;
  readingExperience: GeminiReadingExperience;
  expressiveness: GeminiExpressiveness;
  audioTagMode: GeminiAudioTagMode;
  speed: number;
  directorNotes: string;
  sampleRate: number;
}

export interface VoiceConfig {
  id: string;
  name: string;
  category: string;
  description?: string;
  gender?: "female" | "male" | "unknown";
  isCustom?: boolean;
}
