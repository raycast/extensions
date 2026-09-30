import type {
  QwenTTSFormat,
  QwenTTSLanguageType,
  QwenTTSModel,
  QwenTTSRegion,
  VoiceConfig,
} from "../api/qwen-tts-types";

export const DEFAULT_MODEL: QwenTTSModel = "qwen3-tts-flash";
export const DEFAULT_VOICE = "Cherry";
export const DEFAULT_FORMAT: QwenTTSFormat = "wav";
export const DEFAULT_REGION: QwenTTSRegion = "beijing";
export const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const DEFAULT_LANGUAGE_TYPE: QwenTTSLanguageType = "Auto";
export const DEFAULT_OPTIMIZE_INSTRUCTIONS = false;
export const QWEN_TEXT_CHUNK_LIMIT = 500;

export const QWEN_REGION_BASE_URLS: Record<Exclude<QwenTTSRegion, "custom">, string> = {
  beijing: "https://dashscope.aliyuncs.com/api/v1",
  singapore: "https://dashscope-intl.aliyuncs.com/api/v1",
};

export const QWEN_REGION_LABELS: Record<QwenTTSRegion, string> = {
  beijing: "Beijing · dashscope.aliyuncs.com",
  singapore: "Singapore · dashscope-intl.aliyuncs.com",
  custom: "Custom Endpoint",
};

export const QWEN_REGIONS: readonly QwenTTSRegion[] = ["beijing", "singapore", "custom"];

export interface QwenModelConfig {
  id: QwenTTSModel;
  label: string;
  family: "qwen3-flash" | "qwen3-instruct-flash" | "qwen-tts";
  supportsInstructions: boolean;
  supportsOptimizeInstructions: boolean;
  recommended?: boolean;
}

export const QWEN_MODEL_CONFIGS: readonly QwenModelConfig[] = [
  {
    id: "qwen3-tts-flash",
    label: "Qwen3 TTS Flash",
    family: "qwen3-flash",
    supportsInstructions: false,
    supportsOptimizeInstructions: false,
    recommended: true,
  },
  {
    id: "qwen3-tts-instruct-flash",
    label: "Qwen3 TTS Instruct Flash",
    family: "qwen3-instruct-flash",
    supportsInstructions: true,
    supportsOptimizeInstructions: true,
  },
  {
    id: "qwen-tts-latest",
    label: "Qwen TTS Latest",
    family: "qwen-tts",
    supportsInstructions: false,
    supportsOptimizeInstructions: false,
  },
  {
    id: "qwen-tts",
    label: "Qwen TTS",
    family: "qwen-tts",
    supportsInstructions: false,
    supportsOptimizeInstructions: false,
  },
];

export const QWEN_MODELS: readonly QwenTTSModel[] = QWEN_MODEL_CONFIGS.map((model) => model.id);

export const MODEL_LABELS: Record<QwenTTSModel, string> = Object.fromEntries(
  QWEN_MODEL_CONFIGS.map((model) => [model.id, model.label]),
) as Record<QwenTTSModel, string>;

export const QWEN_LANGUAGE_TYPES: readonly QwenTTSLanguageType[] = [
  "Auto",
  "Chinese",
  "English",
  "German",
  "Italian",
  "Portuguese",
  "Spanish",
  "Japanese",
  "Korean",
  "French",
  "Russian",
];

export const LANGUAGE_TYPE_LABELS: Record<QwenTTSLanguageType, string> = {
  Auto: "Auto",
  Chinese: "Chinese",
  English: "English",
  German: "German",
  Italian: "Italian",
  Portuguese: "Portuguese",
  Spanish: "Spanish",
  Japanese: "Japanese",
  Korean: "Korean",
  French: "French",
  Russian: "Russian",
};

const ALL_LANGUAGES = "Chinese, English, French, German, Russian, Italian, Spanish, Portuguese, Japanese, Korean";
const MANDARIN_LANGUAGES = `Mandarin, ${ALL_LANGUAGES}`;
const SHANGHAI_LANGUAGES = `Shanghainese, ${ALL_LANGUAGES}`;
const BEIJING_LANGUAGES = `Beijing dialect, ${ALL_LANGUAGES}`;
const NANJING_LANGUAGES = `Nanjing dialect, ${ALL_LANGUAGES}`;
const SHAANXI_LANGUAGES = `Shaanxi dialect, ${ALL_LANGUAGES}`;
const MINNAN_LANGUAGES = `Minnan, ${ALL_LANGUAGES}`;
const TIANJIN_LANGUAGES = `Tianjin dialect, ${ALL_LANGUAGES}`;
const SICHUAN_LANGUAGES = `Sichuan dialect, ${ALL_LANGUAGES}`;
const CANTONESE_LANGUAGES = `Cantonese, ${ALL_LANGUAGES}`;

const QWEN3_FLASH_MODELS: QwenTTSModel[] = ["qwen3-tts-flash"];
const LEGACY_QWEN_TTS_LATEST_MODELS: QwenTTSModel[] = ["qwen-tts-latest"];
const CORE_MODELS: QwenTTSModel[] = ["qwen3-tts-flash", "qwen3-tts-instruct-flash", "qwen-tts-latest", "qwen-tts"];
const QWEN3_FLASH_AND_INSTRUCT_MODELS: QwenTTSModel[] = ["qwen3-tts-flash", "qwen3-tts-instruct-flash"];

export const VOICES: VoiceConfig[] = [
  voice(
    "Cherry",
    "Cherry",
    "female",
    "Recommended",
    "芊悦: sunny, positive, friendly female voice.",
    MANDARIN_LANGUAGES,
    CORE_MODELS,
    true,
  ),
  voice(
    "Serena",
    "Serena",
    "female",
    "Recommended",
    "苏瑶: gentle female voice.",
    MANDARIN_LANGUAGES,
    CORE_MODELS,
    true,
  ),
  voice(
    "Ethan",
    "Ethan",
    "male",
    "Recommended",
    "晨煦: warm, energetic Mandarin male voice.",
    MANDARIN_LANGUAGES,
    CORE_MODELS,
    true,
  ),
  voice(
    "Chelsie",
    "Chelsie",
    "female",
    "Character",
    "千雪: anime-style virtual girlfriend voice.",
    MANDARIN_LANGUAGES,
    CORE_MODELS,
  ),
  voice(
    "Momo",
    "Momo",
    "female",
    "Character",
    "茉兔: playful and cute female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Vivian",
    "Vivian",
    "female",
    "Character",
    "十三: cute, expressive female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Moon",
    "Moon",
    "male",
    "Narration",
    "月白: stylish male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Maia",
    "Maia",
    "female",
    "Narration",
    "四月: gentle and intellectual female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Kai",
    "Kai",
    "male",
    "Narration",
    "凯: relaxed, polished male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Nofish",
    "Nofish",
    "male",
    "Character",
    "不吃鱼: designer-like male voice with non-retroflex Mandarin.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Bella",
    "Bella",
    "female",
    "Character",
    "萌宝: childlike, cute female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Jennifer",
    "Jennifer",
    "female",
    "International",
    "詹妮弗: brand-grade cinematic American English female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Ryan",
    "Ryan",
    "male",
    "International",
    "甜茶: dramatic, high-energy male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Katerina",
    "Katerina",
    "female",
    "International",
    "卡捷琳娜: mature, resonant female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Aiden",
    "Aiden",
    "male",
    "International",
    "艾登: American English young male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Eldric Sage",
    "Eldric Sage",
    "male",
    "Narration",
    "沧明子: calm, wise elder voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Mia",
    "Mia",
    "female",
    "Character",
    "乖小妹: gentle, obedient young female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Mochi",
    "Mochi",
    "male",
    "Character",
    "沙小弥: bright, clever childlike voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Bellona",
    "Bellona",
    "female",
    "Narration",
    "燕铮莺: loud, crisp, vivid dramatic voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Vincent",
    "Vincent",
    "male",
    "Narration",
    "田叔: raspy, textured male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Bunny",
    "Bunny",
    "female",
    "Character",
    "萌小姬: strongly cute young female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Neil",
    "Neil",
    "male",
    "Narration",
    "阿闻: professional news-anchor style male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Elias",
    "Elias",
    "female",
    "Narration",
    "墨讲师: precise lecturer voice for complex knowledge narration.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Arthur",
    "Arthur",
    "male",
    "Narration",
    "徐大爷: rustic elder male storyteller voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Nini",
    "Nini",
    "female",
    "Character",
    "邻家妹妹: soft, sweet girl-next-door voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Seren",
    "Seren",
    "female",
    "Narration",
    "小婉: warm, soothing bedtime-style female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Pip",
    "Pip",
    "male",
    "Character",
    "顽屁小孩: mischievous, childlike male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Stella",
    "Stella",
    "female",
    "Character",
    "少女阿月: sweet, animated young female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_AND_INSTRUCT_MODELS,
  ),
  voice(
    "Bodega",
    "Bodega",
    "male",
    "International",
    "博德加: warm Spanish male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Sonrisa",
    "Sonrisa",
    "female",
    "International",
    "索尼莎: cheerful Latin American female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Alek",
    "Alek",
    "male",
    "International",
    "阿列克: cool, warm Russian male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Dolce",
    "Dolce",
    "male",
    "International",
    "多尔切: relaxed Italian male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Sohee",
    "Sohee",
    "female",
    "International",
    "素熙: gentle, expressive Korean female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Ono Anna",
    "Ono Anna",
    "female",
    "International",
    "小野杏: playful Japanese female voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Lenn",
    "Lenn",
    "male",
    "International",
    "莱恩: rational, slightly rebellious German male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Emilien",
    "Emilien",
    "male",
    "International",
    "埃米尔安: romantic French male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Andre",
    "Andre",
    "male",
    "International",
    "安德雷: magnetic, natural, steady male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Radio Gol",
    "Radio Gol",
    "male",
    "International",
    "拉迪奥·戈尔: poetic football-commentary male voice.",
    MANDARIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice("Jada", "Jada", "female", "Dialect", "上海-阿珍: lively Shanghainese female voice.", SHANGHAI_LANGUAGES, [
    ...QWEN3_FLASH_MODELS,
    ...LEGACY_QWEN_TTS_LATEST_MODELS,
  ]),
  voice("Dylan", "Dylan", "male", "Dialect", "北京-晓东: Beijing hutong young male voice.", BEIJING_LANGUAGES, [
    ...QWEN3_FLASH_MODELS,
    ...LEGACY_QWEN_TTS_LATEST_MODELS,
  ]),
  voice("Li", "Li", "male", "Dialect", "南京-老李: patient Nanjing male voice.", NANJING_LANGUAGES, QWEN3_FLASH_MODELS),
  voice(
    "Marcus",
    "Marcus",
    "male",
    "Dialect",
    "陕西-秦川: grounded Shaanxi male voice.",
    SHAANXI_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice("Roy", "Roy", "male", "Dialect", "闽南-阿杰: witty Minnan male voice.", MINNAN_LANGUAGES, QWEN3_FLASH_MODELS),
  voice(
    "Peter",
    "Peter",
    "male",
    "Dialect",
    "天津-李彼得: Tianjin crosstalk-style male voice.",
    TIANJIN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice("Sunny", "Sunny", "female", "Dialect", "四川-晴儿: sweet Sichuan female voice.", SICHUAN_LANGUAGES, [
    ...QWEN3_FLASH_MODELS,
    ...LEGACY_QWEN_TTS_LATEST_MODELS,
  ]),
  voice(
    "Eric",
    "Eric",
    "male",
    "Dialect",
    "四川-程川: lively Chengdu male voice.",
    SICHUAN_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Rocky",
    "Rocky",
    "male",
    "Dialect",
    "粤语-阿强: humorous Cantonese male voice.",
    CANTONESE_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
  voice(
    "Kiki",
    "Kiki",
    "female",
    "Dialect",
    "粤语-阿清: sweet Cantonese female voice.",
    CANTONESE_LANGUAGES,
    QWEN3_FLASH_MODELS,
  ),
];

export const VOICE_CATEGORIES = ["Recommended", "Narration", "Character", "International", "Dialect"] as const;

export interface VoicePick {
  readonly voiceId: string;
  readonly purpose: string;
}

/**
 * Curated voices pinned in a "My Picks" section at the top of the Read with Voice command.
 * Order here is display order; `purpose` is shown as a short accessory tag.
 * All picks live on qwen3-tts-flash (the default model). Qwen has no dedicated British (英音)
 * persona, so the 英音 slot uses a general English-capable voice — accent is not guaranteed.
 * Picks unavailable on the active model are filtered out by getReadWithVoicePicks.
 */
export const READ_WITH_VOICE_PICKS: readonly VoicePick[] = [
  { voiceId: "Cherry", purpose: "普通话" },
  { voiceId: "Serena", purpose: "普通话" },
  { voiceId: "Ethan", purpose: "普通话" },
  { voiceId: "Neil", purpose: "普通话" },
  { voiceId: "Elias", purpose: "普通话" },
  { voiceId: "Jennifer", purpose: "美音" },
  { voiceId: "Aiden", purpose: "美音" },
  { voiceId: "Andre", purpose: "英音(通用)" },
  { voiceId: "Lenn", purpose: "德语" },
  { voiceId: "Rocky", purpose: "粤语" },
  { voiceId: "Kiki", purpose: "粤语" },
  { voiceId: "Peter", purpose: "天津" },
  { voiceId: "Roy", purpose: "闽南" },
];

export interface ResolvedVoicePick {
  voice: VoiceConfig;
  purpose: string;
}

export function getReadWithVoicePicks(model: QwenTTSModel): ResolvedVoicePick[] {
  return READ_WITH_VOICE_PICKS.flatMap((pick) => {
    const voice = getVoiceById(pick.voiceId);
    if (!voice || !voice.models.includes(model)) return [];
    return [{ voice, purpose: pick.purpose }];
  });
}

/**
 * Curated picks that exist but are unavailable on the given model (e.g. the Minnan/Tianjin
 * dialect personas are exclusive to qwen3-tts-flash). Used to surface a hint instead of
 * letting these voices silently vanish when a less capable model is active.
 */
export function getHiddenReadWithVoicePicks(model: QwenTTSModel): ResolvedVoicePick[] {
  return READ_WITH_VOICE_PICKS.flatMap((pick) => {
    const voice = getVoiceById(pick.voiceId);
    if (!voice || voice.models.includes(model)) return [];
    return [{ voice, purpose: pick.purpose }];
  });
}

export function getModelConfig(model: QwenTTSModel): QwenModelConfig {
  return QWEN_MODEL_CONFIGS.find((config) => config.id === model) ?? QWEN_MODEL_CONFIGS[0];
}

export function supportsInstructions(model: QwenTTSModel): boolean {
  return getModelConfig(model).supportsInstructions;
}

export function supportsOptimizeInstructions(model: QwenTTSModel): boolean {
  return getModelConfig(model).supportsOptimizeInstructions;
}

export function getQwenRegionBaseUrl(region: QwenTTSRegion): string {
  return region === "singapore" ? QWEN_REGION_BASE_URLS.singapore : QWEN_REGION_BASE_URLS.beijing;
}

export function inferQwenRegion(baseUrl: string | undefined): QwenTTSRegion {
  const normalized = normalizeQwenBaseUrl(baseUrl);
  if (!normalized) return DEFAULT_REGION;
  if (normalized === QWEN_REGION_BASE_URLS.beijing) return "beijing";
  if (normalized === QWEN_REGION_BASE_URLS.singapore) return "singapore";
  return "custom";
}

export function normalizeQwenBaseUrl(baseUrl: string | undefined): string {
  const normalized = normalizeBaseUrl(baseUrl);
  if (!normalized) return DEFAULT_BASE_URL;
  if (normalized.startsWith("wss://dashscope-intl.aliyuncs.com/api-ws/v1/realtime")) {
    return QWEN_REGION_BASE_URLS.singapore;
  }
  if (normalized.startsWith("wss://dashscope.aliyuncs.com/api-ws/v1/realtime")) {
    return QWEN_REGION_BASE_URLS.beijing;
  }
  return normalized.replace(/\/services\/aigc\/multimodal-generation\/generation$/, "");
}

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
      [
        voice.id,
        voice.name,
        voice.category,
        voice.language,
        voice.description,
        ...voice.models,
        ...voice.models.map((model) => MODEL_LABELS[model]),
        "qwen",
        "qwen-tts",
        "dashscope",
        "aliyun",
      ]
        .flatMap((value) => value.split(/[\s,，:：·-]+/))
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );
}

function voice(
  id: string,
  name: string,
  gender: VoiceConfig["gender"],
  category: string,
  description: string,
  language: string,
  models: QwenTTSModel[],
  recommended = false,
): VoiceConfig {
  return { id, name, gender, category, description, language, models: uniqueModels(models), recommended };
}

function uniqueModels(models: QwenTTSModel[]): QwenTTSModel[] {
  return Array.from(new Set(models));
}

function normalizeBaseUrl(baseUrl: string | undefined): string | undefined {
  return baseUrl?.trim().replace(/\/+$/, "");
}
