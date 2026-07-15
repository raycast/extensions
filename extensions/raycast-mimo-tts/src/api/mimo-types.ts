export type MimoTTSModel = "mimo-v2.5-tts" | "mimo-v2-tts" | "mimo-v2.5-tts-voicedesign" | "mimo-v2.5-tts-voiceclone";

// The standalone MiMo TTS extension currently only emits "wav". The PCM
// streaming infrastructure in AudioPlayer is dormant scaffolding inherited
// from AI Voice Studio (which uses pcm16 for the Qwen-TTS realtime path);
// keeping the format type narrowed to "wav" here makes the contract obvious
// and prevents callers from threading a "pcm16" through code that never
// produces it.
export type MimoAudioFormat = "wav";

export interface VoiceCloneSample {
  /** MIME type, e.g. "audio/mpeg" or "audio/wav". */
  mimeType: string;
  /** Base64 string without the data: prefix. */
  base64: string;
}

export interface TTSOptions {
  model: MimoTTSModel;
  /** Voice ID for preset/legacy models. Ignored when voiceCloneSample is set. */
  voice: string;
  /**
   * For preset/clone models: speaking-style instruction (goes into the leading
   * user message). For voicedesign: the voice description prompt itself.
   */
  stylePrompt?: string;
  openingStyleTags?: string[];
  audioEventTags?: string[];
  format: MimoAudioFormat;
  playbackRate: number;
  tokenPlanBaseUrl?: string;
  /** voicedesign-only: let MiMo auto-rewrite the assistant text. */
  optimizeTextPreview?: boolean;
  /** voiceclone-only: inline audio sample to replicate. */
  voiceCloneSample?: VoiceCloneSample;
}

export interface TTSOptionOverrides {
  speechRate?: string;
  baseStylePrompt?: string;
  additionalStylePrompt?: string;
  openingStyleTags?: string[];
  audioEventTags?: string[];
  optimizeTextPreview?: boolean;
  voiceCloneSample?: VoiceCloneSample;
}

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

export function isPresetModel(model: MimoTTSModel): boolean {
  return model === "mimo-v2.5-tts" || model === "mimo-v2-tts";
}

export function isVoiceDesignModel(model: MimoTTSModel): model is "mimo-v2.5-tts-voicedesign" {
  return model === "mimo-v2.5-tts-voicedesign";
}

export function isVoiceCloneModel(model: MimoTTSModel): model is "mimo-v2.5-tts-voiceclone" {
  return model === "mimo-v2.5-tts-voiceclone";
}
