import { existsSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { getHfHubCacheDirs, MODELS_DIR } from "./paths";

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  filename: string;
  languages?: string[];
  supportsLanguageSelection: boolean;
  supportsAuto: boolean;
  speed: "Very fast" | "Fast" | "Balanced" | "Slower";
  path?: string;
  repoId?: string;
}

export const MODELS: ModelInfo[] = [
  {
    id: "small",
    name: "Whisper Small",
    description: "Lightweight multilingual Whisper",
    filename: "ggml-small.bin",
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Fast",
  },
  {
    id: "medium",
    name: "Whisper Medium",
    description: "More accurate multilingual Whisper",
    filename: "whisper-medium-q4_1.bin",
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Balanced",
  },
  {
    id: "turbo",
    name: "Whisper Turbo",
    description: "Recommended balance of speed and accuracy",
    filename: "ggml-large-v3-turbo.bin",
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Fast",
  },
  {
    id: "large",
    name: "Whisper Large",
    description: "Highest-quality multilingual Whisper",
    filename: "ggml-large-v3-q5_0.bin",
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Slower",
  },
  {
    id: "breeze-asr",
    name: "Breeze ASR",
    description: "Taiwanese Mandarin and code-switching",
    filename: "breeze-asr-q5_k.bin",
    languages: ["zh", "zh-Hans", "zh-Hant", "en"],
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Balanced",
  },
  {
    id: "parakeet-tdt-0.6b-v2",
    name: "Parakeet V2",
    description: "Fast English transcription",
    filename: "parakeet-tdt-0.6b-v2-int8",
    languages: ["en"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Very fast",
  },
  {
    id: "parakeet-tdt-0.6b-v3",
    name: "Parakeet V3",
    description: "Fast European-language transcription",
    filename: "parakeet-tdt-0.6b-v3-int8",
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Very fast",
  },
  {
    id: "moonshine-base",
    name: "Moonshine Base",
    description: "Fast English speech recognition",
    filename: "moonshine-base",
    languages: ["en"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Very fast",
  },
  {
    id: "moonshine-tiny-streaming-en",
    name: "Moonshine V2 Tiny",
    description: "Ultra-fast streaming English",
    filename: "moonshine-tiny-streaming-en",
    languages: ["en"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Very fast",
  },
  {
    id: "moonshine-small-streaming-en",
    name: "Moonshine V2 Small",
    description: "Fast streaming English",
    filename: "moonshine-small-streaming-en",
    languages: ["en"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Very fast",
  },
  {
    id: "moonshine-medium-streaming-en",
    name: "Moonshine V2 Medium",
    description: "Higher-quality streaming English",
    filename: "moonshine-medium-streaming-en",
    languages: ["en"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Fast",
  },
  {
    id: "sense-voice-int8",
    name: "SenseVoice",
    description: "Chinese, English, Japanese, Korean, and Cantonese",
    filename: "sense-voice-int8",
    languages: ["zh", "zh-Hans", "zh-Hant", "en", "yue", "ja", "ko"],
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Fast",
  },
  {
    id: "gigaam-v3-e2e-ctc",
    name: "GigaAM v3",
    description: "Fast, accurate Russian transcription",
    filename: "giga-am-v3-int8",
    languages: ["ru"],
    supportsLanguageSelection: false,
    supportsAuto: false,
    speed: "Fast",
  },
  {
    id: "canary-180m-flash",
    name: "Canary 180M Flash",
    description: "Compact English, German, Spanish, and French model",
    filename: "canary-180m-flash",
    languages: ["en", "de", "es", "fr"],
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Very fast",
  },
  {
    id: "canary-1b-v2",
    name: "Canary 1B v2",
    description: "Accurate multilingual European model",
    filename: "canary-1b-v2",
    languages: [
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
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Balanced",
  },
  {
    id: "cohere-int8",
    name: "Cohere",
    description: "Multilingual speech recognition",
    filename: "cohere-int8",
    supportsLanguageSelection: true,
    supportsAuto: true,
    speed: "Balanced",
  },
];

export function getDownloadedModels(): ModelInfo[] {
  const known = MODELS.filter((model) => existsSync(join(MODELS_DIR, model.filename)));
  const knownFiles = new Set(MODELS.map((model) => model.filename));
  let custom: ModelInfo[] = [];
  try {
    custom = readdirSync(MODELS_DIR, { withFileTypes: true })
      .filter(
        (entry) =>
          !entry.name.startsWith(".") &&
          !knownFiles.has(entry.name) &&
          (entry.isDirectory() || /\.(bin|gguf|onnx)$/i.test(entry.name)),
      )
      .map((entry) => ({
        id: entry.name,
        name: basename(entry.name),
        description: "Custom model",
        filename: entry.name,
        supportsLanguageSelection: true,
        supportsAuto: true,
        speed: "Balanced",
      }));
  } catch {
    custom = [];
  }
  return [...known, ...custom, ...scanHfHubCache()];
}

function decodeHfRepoId(cacheDirName: string): string | null {
  const prefix = "models--";
  if (!cacheDirName.startsWith(prefix)) return null;
  const rest = cacheDirName.slice(prefix.length);
  if (!rest) return null;
  return rest.split("--").join("/");
}

function scanHfHubCache(): ModelInfo[] {
  const byId = new Map<string, ModelInfo>();
  for (const hubDir of getHfHubCacheDirs()) {
    let repos;
    try {
      repos = readdirSync(hubDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const repo of repos) {
      if (!repo.isDirectory() || !repo.name.startsWith("models--")) continue;
      const repoId = decodeHfRepoId(repo.name);
      if (!repoId) continue;
      let snapshots;
      try {
        snapshots = readdirSync(join(hubDir, repo.name, "snapshots"), { withFileTypes: true });
      } catch {
        continue;
      }
      for (const snapshot of snapshots) {
        if (!snapshot.isDirectory() || snapshot.name.startsWith(".")) continue;
        const snapshotDir = join(hubDir, repo.name, "snapshots", snapshot.name);
        let files;
        try {
          files = readdirSync(snapshotDir, { withFileTypes: true });
        } catch {
          continue;
        }
        for (const file of files) {
          if (file.name.startsWith(".") || file.name.endsWith(".partial") || file.name.endsWith(".lock")) continue;
          if (!/\.(bin|gguf|onnx)$/i.test(file.name)) continue;
          const absPath = join(snapshotDir, file.name);
          let size = 0;
          try {
            const st = statSync(absPath);
            if (!st.isFile() || st.size === 0) continue;
            size = st.size;
          } catch {
            continue;
          }
          const id = `${repoId}/${file.name}`;
          const existing = byId.get(id);
          if (existing?.path) {
            try {
              if (size <= statSync(existing.path).size) continue;
            } catch {
              /* replace stale entry */
            }
          }
          const stem = basename(file.name).replace(/\.(bin|gguf|onnx)$/i, "");
          byId.set(id, {
            id,
            name: stem,
            description: `Hugging Face · ${repoId}`,
            filename: file.name,
            supportsLanguageSelection: true,
            supportsAuto: true,
            speed: "Balanced",
            path: absPath,
            repoId,
          });
        }
      }
    }
  }
  return [...byId.values()];
}

export function modelDiskSize(model: ModelInfo): number | undefined {
  try {
    const path = model.path ?? join(MODELS_DIR, model.filename);
    if (!statSync(path).isFile()) return undefined;
    return statSync(path).size;
  } catch {
    return undefined;
  }
}
