/**
 * Legacy model registry for Handy versions predating transcribe.cpp (#1529),
 * which downloaded built-in models as flat files/dirs into
 * `Application Support/com.pais.handy/models` and stored `selected_model` as a
 * short id (e.g. "small", "parakeet-tdt-0.6b-v2"). Newer Handy uses the
 * HuggingFace cache instead (see `catalog.ts` / `models.ts`); this list keeps
 * users on older builds working — correct names, capabilities, and ids.
 */
export interface LegacyModel {
  id: string; // value Handy stores in selected_model on legacy builds
  name: string;
  description: string;
  filename: string; // file or directory name inside the models dir
  isDirectory: boolean;
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = all Whisper languages
}

export const LEGACY_MODELS: LegacyModel[] = [
  {
    id: "small",
    name: "Whisper Small",
    description: "Fast, fairly accurate",
    filename: "ggml-small.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "medium",
    name: "Whisper Medium",
    description: "Good accuracy, medium speed",
    filename: "whisper-medium-q4_1.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "turbo",
    name: "Whisper Turbo",
    description: "Balanced accuracy and speed",
    filename: "ggml-large-v3-turbo.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "large",
    name: "Whisper Large",
    description: "Good accuracy, but slow",
    filename: "ggml-large-v3-q5_0.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "breeze-asr",
    name: "Breeze ASR",
    description: "Taiwanese Mandarin, code-switching",
    filename: "breeze-asr-q5_k.bin",
    isDirectory: false,
    supportsLanguageSelection: true,
  },
  {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet V2",
    description: "English only",
    filename: "parakeet-tdt-0.6b-v2-int8",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet V3",
    description: "25 European languages",
    filename: "parakeet-tdt-0.6b-v3-int8",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-base",
    name: "Moonshine Base",
    description: "Very fast, English only",
    filename: "moonshine-base",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-tiny-streaming-en",
    name: "Moonshine V2 Tiny",
    description: "Ultra-fast, English only",
    filename: "moonshine-tiny-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-small-streaming-en",
    name: "Moonshine V2 Small",
    description: "Fast, English only",
    filename: "moonshine-small-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "moonshine-medium-streaming-en",
    name: "Moonshine V2 Medium",
    description: "High quality, English only",
    filename: "moonshine-medium-streaming-en",
    isDirectory: true,
    supportsLanguageSelection: false,
  },
  {
    id: "sense-voice-int8",
    name: "SenseVoice",
    description: "ZH/EN/JA/KO/Cantonese",
    filename: "sense-voice-int8",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: ["zh", "zh-Hans", "zh-Hant", "en", "yue", "ja", "ko"],
  },
  {
    id: "gigaam-v3-e2e-ctc",
    name: "GigaAM v3",
    description: "Russian, fast and accurate",
    filename: "giga-am-v3.int8.onnx",
    isDirectory: false,
    supportsLanguageSelection: false,
  },
  {
    id: "canary-180m-flash",
    name: "Canary 180M Flash",
    description: "Very fast. English, German, Spanish, French",
    filename: "canary-180m-flash",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: ["en", "de", "es", "fr"],
  },
  {
    id: "canary-1b-v2",
    name: "Canary 1B v2",
    description: "Accurate multilingual. 25 European languages",
    filename: "canary-1b-v2",
    isDirectory: true,
    supportsLanguageSelection: true,
    supportedLanguages: [
      "bg",
      "hr",
      "cs",
      "da",
      "nl",
      "en",
      "et",
      "fi",
      "fr",
      "de",
      "el",
      "hu",
      "it",
      "lv",
      "lt",
      "mt",
      "pl",
      "pt",
      "ro",
      "sk",
      "sl",
      "es",
      "sv",
      "ru",
      "uk",
    ],
  },
];

export const legacyModelByFilename = new Map(
  LEGACY_MODELS.map((model) => [model.filename, model]),
);

export const legacyModelById = new Map(
  LEGACY_MODELS.map((model) => [model.id, model]),
);
