import type { MimoTTSModel, VoiceConfig } from "../api/mimo-types";

export const DEFAULT_MODEL: MimoTTSModel = "mimo-v2.5-tts";
export const DEFAULT_VOICE = "Chloe";
export const LEGACY_DEFAULT_VOICE = "default_en";

export const MODEL_LABELS: Record<MimoTTSModel, string> = {
  "mimo-v2.5-tts": "MiMo-V2.5-TTS",
  "mimo-v2-tts": "MiMo-V2-TTS",
  "mimo-v2.5-tts-voicedesign": "MiMo-V2.5-TTS-VoiceDesign",
  "mimo-v2.5-tts-voiceclone": "MiMo-V2.5-TTS-VoiceClone",
};

export const VOICES: VoiceConfig[] = [
  {
    id: "Mia",
    name: "Mia",
    gender: "female",
    category: "English",
    language: "English",
    description: "Natural English female voice for notes, articles, and dialogue.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "Chloe",
    name: "Chloe",
    gender: "female",
    category: "English",
    language: "English",
    description: "Expressive English female voice with a lively delivery.",
    models: ["mimo-v2.5-tts"],
    recommended: true,
  },
  {
    id: "Milo",
    name: "Milo",
    gender: "male",
    category: "English",
    language: "English",
    description: "Warm English male voice for conversational playback.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "Dean",
    name: "Dean",
    gender: "male",
    category: "English",
    language: "English",
    description: "Grounded English male voice for narration and summaries.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "冰糖",
    name: "Bingtang",
    gender: "female",
    category: "Chinese",
    language: "Chinese",
    description: "Clear Chinese female voice for daily reading and narration.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "茉莉",
    name: "Moli",
    gender: "female",
    category: "Chinese",
    language: "Chinese",
    description: "Soft Chinese female voice with a calm, polished tone.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "苏打",
    name: "Soda",
    gender: "male",
    category: "Chinese",
    language: "Chinese",
    description: "Bright Chinese male voice for explanations and short-form reading.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "白桦",
    name: "Baihua",
    gender: "male",
    category: "Chinese",
    language: "Chinese",
    description: "Steady Chinese male voice suited to longer text.",
    models: ["mimo-v2.5-tts"],
  },
  {
    id: "default_en",
    name: "MiMo English Female",
    gender: "female",
    category: "Legacy",
    language: "English",
    description: "Legacy MiMo-V2 English female voice.",
    models: ["mimo-v2-tts"],
  },
  {
    id: "default_zh",
    name: "MiMo Chinese Female",
    gender: "female",
    category: "Legacy",
    language: "Chinese",
    description: "Legacy MiMo-V2 Chinese female voice.",
    models: ["mimo-v2-tts"],
  },
];

export const VOICE_CATEGORIES = ["English", "Chinese", "Legacy"] as const;

export function getVoicesByCategory(category: string, model?: MimoTTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.category === category && (!model || voice.models.includes(model)));
}

export function getVoicesForModel(model: MimoTTSModel): VoiceConfig[] {
  return VOICES.filter((voice) => voice.models.includes(model));
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return VOICES.find((voice) => voice.id === id);
}

export function isVoiceAvailableForModel(voice: VoiceConfig, model: MimoTTSModel): boolean {
  return voice.models.includes(model);
}

export function getDefaultVoiceForModel(model: MimoTTSModel): string {
  return model === "mimo-v2-tts" ? LEGACY_DEFAULT_VOICE : DEFAULT_VOICE;
}

export function normalizeVoiceForModel(value: string | undefined, model: MimoTTSModel): string {
  const id = value?.trim();
  if (id) {
    const voice = getVoiceById(id);
    if (voice && isVoiceAvailableForModel(voice, model)) return voice.id;
  }
  return getDefaultVoiceForModel(model);
}
