import type { OpenAITTSModel, OpenAIResponseFormat, VoiceConfig } from "../api/openai-types";

export const DEFAULT_MODEL: OpenAITTSModel = "gpt-4o-mini-tts";
export const DEFAULT_VOICE = "cedar";
// WAV avoids decode overhead → lowest first-audio latency for pipelined
// playback (OpenAI Speech API docs recommend wav/pcm for fastest response).
export const DEFAULT_FORMAT: OpenAIResponseFormat = "wav";

export const MODEL_LABELS: Record<OpenAITTSModel, string> = {
  "gpt-4o-mini-tts": "GPT-4o Mini TTS",
};

const SUPPORTED_MODELS: OpenAITTSModel[] = ["gpt-4o-mini-tts"];

export const VOICES: VoiceConfig[] = [
  {
    id: "cedar",
    name: "Cedar",
    gender: "male",
    category: "Recommended",
    description: "Recommended OpenAI voice for high-quality natural narration.",
    models: SUPPORTED_MODELS,
    recommended: true,
  },
  {
    id: "marin",
    name: "Marin",
    gender: "female",
    category: "Recommended",
    description: "Recommended OpenAI voice for polished, clear reading.",
    models: SUPPORTED_MODELS,
    recommended: true,
  },
  {
    id: "coral",
    name: "Coral",
    gender: "female",
    category: "General",
    description: "Bright, friendly voice suitable for everyday reading.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "alloy",
    name: "Alloy",
    gender: "neutral",
    category: "General",
    description: "Balanced neutral voice for general-purpose narration.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "ash",
    name: "Ash",
    gender: "male",
    category: "General",
    description: "Clear, steady voice for notes and articles.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "ballad",
    name: "Ballad",
    gender: "male",
    category: "Expressive",
    description: "Expressive voice for richer narration and dramatic text.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "echo",
    name: "Echo",
    gender: "male",
    category: "General",
    description: "Crisp voice for concise summaries and explanations.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "fable",
    name: "Fable",
    gender: "neutral",
    category: "Expressive",
    description: "Storytelling voice with a warm delivery.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "nova",
    name: "Nova",
    gender: "female",
    category: "General",
    description: "Smooth, energetic voice for modern narration.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "onyx",
    name: "Onyx",
    gender: "male",
    category: "Deep",
    description: "Deeper voice for measured long-form reading.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "sage",
    name: "Sage",
    gender: "female",
    category: "General",
    description: "Calm voice for careful reading and explanation.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "shimmer",
    name: "Shimmer",
    gender: "female",
    category: "General",
    description: "Light, upbeat voice for short text and casual reading.",
    models: SUPPORTED_MODELS,
  },
  {
    id: "verse",
    name: "Verse",
    gender: "neutral",
    category: "Expressive",
    description: "Expressive voice for lyrical or stylized passages.",
    models: SUPPORTED_MODELS,
  },
];

export const VOICE_CATEGORIES = ["Recommended", "General", "Expressive", "Deep"] as const;

export function getVoicesByCategory(category: string, model?: OpenAITTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.category === category && (!model || voice.models.includes(model)));
}

export function getVoicesForModel(model: OpenAITTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.models.includes(model));
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return VOICES.find((voice) => voice.id === id);
}

export function isVoiceAvailableForModel(voice: VoiceConfig, model: OpenAITTSModel): boolean {
  return voice.models.includes(model);
}
