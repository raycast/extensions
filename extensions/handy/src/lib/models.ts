import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { MODELS_DIR } from "./constants";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  isDirectory: boolean;
}

export const MODEL_REGISTRY: ModelInfo[] = [
  {
    id: "small",
    name: "Whisper Small",
    description: "Fast, fairly accurate",
    filename: "ggml-small.bin",
    isDirectory: false,
  },
  {
    id: "medium",
    name: "Whisper Medium",
    description: "Good accuracy, medium speed",
    filename: "whisper-medium-q4_1.bin",
    isDirectory: false,
  },
  {
    id: "turbo",
    name: "Whisper Turbo",
    description: "Balanced accuracy and speed",
    filename: "ggml-large-v3-turbo.bin",
    isDirectory: false,
  },
  {
    id: "large",
    name: "Whisper Large",
    description: "Good accuracy, but slow",
    filename: "ggml-large-v3-q5_0.bin",
    isDirectory: false,
  },
  {
    id: "breeze-asr",
    name: "Breeze ASR",
    description: "Taiwanese Mandarin, code-switching",
    filename: "breeze-asr-q5_k.bin",
    isDirectory: false,
  },
  {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet V2",
    description: "English only",
    filename: "parakeet-tdt-0.6b-v2-int8",
    isDirectory: true,
  },
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet V3",
    description: "25 European languages",
    filename: "parakeet-tdt-0.6b-v3-int8",
    isDirectory: true,
  },
  {
    id: "moonshine-base",
    name: "Moonshine Base",
    description: "Very fast, English only",
    filename: "moonshine-base",
    isDirectory: true,
  },
  {
    id: "moonshine-tiny-streaming-en",
    name: "Moonshine V2 Tiny",
    description: "Ultra-fast, English only",
    filename: "moonshine-tiny-streaming-en",
    isDirectory: true,
  },
  {
    id: "moonshine-small-streaming-en",
    name: "Moonshine V2 Small",
    description: "Fast, English only",
    filename: "moonshine-small-streaming-en",
    isDirectory: true,
  },
  {
    id: "moonshine-medium-streaming-en",
    name: "Moonshine V2 Medium",
    description: "High quality, English only",
    filename: "moonshine-medium-streaming-en",
    isDirectory: true,
  },
  {
    id: "sense-voice-int8",
    name: "SenseVoice",
    description: "ZH/EN/JA/KO/Cantonese",
    filename: "sense-voice-int8",
    isDirectory: true,
  },
  {
    id: "gigaam-v3-e2e-ctc",
    name: "GigaAM v3",
    description: "Russian, fast and accurate",
    filename: "giga-am-v3.int8.onnx",
    isDirectory: false,
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
      .filter((f) => f.endsWith(".bin") && !knownFilenames.has(f))
      .map((f) => ({
        id: f,
        name: f,
        description: "Custom model",
        filename: f,
        isDirectory: false,
      }));
  } catch {
    /* models dir not created yet */
  }
  return [...known, ...custom];
}
