export type GeminiTTSModel =
  | "gemini-3.1-flash-tts-preview"
  | "gemini-2.5-flash-preview-tts"
  | "gemini-2.5-pro-preview-tts";
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
export type GeminiSpeakerMode = "single" | "auto-two-speaker";

export interface GeminiTTSRequest {
  systemInstruction?: {
    parts: Array<{
      text: string;
    }>;
  };
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig: {
    responseModalities: ["AUDIO"];
    speechConfig: {
      voiceConfig?: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
      multiSpeakerVoiceConfig?: {
        speakerVoiceConfigs: Array<{
          speaker: string;
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: string;
            };
          };
        }>;
      };
    };
  };
}

export interface SynthesisResult {
  wavPath: string;
  managed: boolean;
  cacheHit: boolean;
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
  speakerMode: GeminiSpeakerMode;
  secondaryVoiceId: string;
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
