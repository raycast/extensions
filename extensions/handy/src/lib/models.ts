import { existsSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { MODELS_DIR } from "./constants";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  isDirectory: boolean;
  supportsLanguageSelection: boolean;
  supportedLanguages?: string[]; // undefined = all Whisper languages
}

export const MODEL_REGISTRY: ModelInfo[] = [
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

export function isDownloaded(
  model: ModelInfo,
  modelsDir = MODELS_DIR,
): boolean {
  return existsSync(join(modelsDir, model.filename));
}

export function getDownloadedModels(modelsDir = MODELS_DIR): ModelInfo[] {
  const known = MODEL_REGISTRY.filter((m) => isDownloaded(m, modelsDir));
  const knownFilenames = new Set(MODEL_REGISTRY.map((m) => m.filename));
  let custom: ModelInfo[] = [];
  try {
    custom = readdirSync(modelsDir)
      .filter((f) => !knownFilenames.has(f))
      .map((f) => {
        const isDir = statSync(join(modelsDir, f)).isDirectory();
        if (!isDir && !f.endsWith(".bin")) return null;
        return {
          id: f,
          name: f,
          description: "Custom model",
          filename: f,
          isDirectory: isDir,
          supportsLanguageSelection: true, // safe fallback: show all languages
        };
      })
      .filter(Boolean) as ModelInfo[];
  } catch {
    /* models dir not created yet */
  }
  return [...known, ...custom];
}
