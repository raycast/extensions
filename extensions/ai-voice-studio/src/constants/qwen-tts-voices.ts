import type { QwenTTSFormat, QwenTTSLanguageType, QwenTTSModel, VoiceConfig } from "../api/qwen-tts-types";

export const DEFAULT_MODEL: QwenTTSModel = "qwen3-tts-flash";
export const DEFAULT_VOICE = "Cherry";
export const DEFAULT_FORMAT: QwenTTSFormat = "wav";
export const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const DEFAULT_LANGUAGE_TYPE: QwenTTSLanguageType = "Auto";

export const MODEL_LABELS: Record<QwenTTSModel, string> = {
  "qwen3-tts-flash": "Qwen3 TTS Flash",
  "qwen3-tts-instruct-flash": "Qwen3 TTS Instruct Flash",
  "qwen-tts-latest": "Qwen TTS Latest",
  "qwen-tts": "Qwen TTS",
};

export const LANGUAGE_TYPE_LABELS: Record<QwenTTSLanguageType, string> = {
  Auto: "Auto",
  Chinese: "Chinese",
  English: "English",
  German: "German",
};

const QWEN3_FLASH_MODELS: QwenTTSModel[] = ["qwen3-tts-flash", "qwen3-tts-instruct-flash"];
const ALL_QWEN_MODELS: QwenTTSModel[] = ["qwen3-tts-flash", "qwen3-tts-instruct-flash", "qwen-tts-latest", "qwen-tts"];

export const VOICES: VoiceConfig[] = [
  {
    id: "Cherry",
    name: "Cherry",
    gender: "female",
    category: "Recommended",
    description: "芊悦: sunny, positive, friendly female voice.",
    language: "Chinese, English, German, and more",
    models: ALL_QWEN_MODELS,
    recommended: true,
  },
  {
    id: "Serena",
    name: "Serena",
    gender: "female",
    category: "Recommended",
    description: "苏瑶: gentle female voice.",
    language: "Chinese, English, German, and more",
    models: ALL_QWEN_MODELS,
    recommended: true,
  },
  {
    id: "Ethan",
    name: "Ethan",
    gender: "male",
    category: "Recommended",
    description: "晨煦: warm, energetic Mandarin male voice.",
    language: "Chinese, English, German, and more",
    models: ALL_QWEN_MODELS,
    recommended: true,
  },
  {
    id: "Chelsie",
    name: "Chelsie",
    gender: "female",
    category: "Character",
    description: "千雪: anime-style virtual girlfriend voice.",
    language: "Chinese, English, German, and more",
    models: ALL_QWEN_MODELS,
  },
  {
    id: "Momo",
    name: "Momo",
    gender: "female",
    category: "Character",
    description: "茉兔: playful and cute female voice.",
    language: "Chinese, English, German, and more",
    models: QWEN3_FLASH_MODELS,
  },
  {
    id: "Vivian",
    name: "Vivian",
    gender: "female",
    category: "Character",
    description: "十三: cute, expressive female voice.",
    language: "Chinese, English, German, and more",
    models: QWEN3_FLASH_MODELS,
  },
  {
    id: "Moon",
    name: "Moon",
    gender: "male",
    category: "Narration",
    description: "月白: stylish male voice.",
    language: "Chinese, English, German, and more",
    models: QWEN3_FLASH_MODELS,
  },
  {
    id: "Maia",
    name: "Maia",
    gender: "female",
    category: "Narration",
    description: "四月: gentle and intellectual female voice.",
    language: "Chinese, English, German, and more",
    models: QWEN3_FLASH_MODELS,
  },
];

export const VOICE_CATEGORIES = ["Recommended", "Narration", "Character"] as const;

export function getVoicesByCategory(category: string, model?: QwenTTSModel): VoiceConfig[] {
  return VOICES.filter((voice, index, list) => {
    if (list.findIndex((candidate) => candidate.id === voice.id && candidate.category === voice.category) !== index) {
      return false;
    }
    return voice.category === category && (!model || voice.models.includes(model));
  });
}

export function getVoicesForModel(model: QwenTTSModel): VoiceConfig[] {
  return VOICES.filter((voice, index, list) => {
    if (list.findIndex((candidate) => candidate.id === voice.id) !== index) return false;
    return voice.models.includes(model);
  });
}

export function getVoiceById(id: string): VoiceConfig | undefined {
  return VOICES.find((voice) => voice.id === id);
}

export function isVoiceAvailableForModel(voice: VoiceConfig, model: QwenTTSModel): boolean {
  return voice.models.includes(model);
}

export function getVoiceSearchKeywords(voice: VoiceConfig): string[] {
  return Array.from(
    new Set(
      [voice.id, voice.name, voice.category, voice.language, voice.description, "qwen", "dashscope", "aliyun"]
        .flatMap((value) => value.split(/[\s,，:：-]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}
