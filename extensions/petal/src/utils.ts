import { getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { PetalModel, PetalModelCatalogEntry } from "./types";

const execFileAsync = promisify(execFile);

const DEFAULT_HISTORY_DIR = "~/Documents/petal/history";
const DEFAULT_MODELS_DIR = "~/Documents/petal/models";

export const PETAL_BUNDLE_ID = "com.optimalapps.petal";
export const PETAL_DEFAULTS_DOMAIN = "com.optimalapps.petal";

export const DEFAULT_MODEL_ID = "parakeet-tdt-ctc-110m";

export const PETAL_MODELS: PetalModel[] = [
  {
    id: "apple-speech",
    name: "Apple Speech",
    summary: "Uses Apple's on-device Speech framework. No model download required.",
    provider: "Apple Speech",
    icon: "model-swift.png",
    isDownloaded: true,
  },
  {
    id: "parakeet-tdt-ctc-110m",
    name: "Parakeet 110M",
    summary: "Ultra-light hybrid TDT-CTC model with a fused encoder for near-instant English dictation.",
    provider: "NVIDIA",
    icon: "model-nvidia.png",
    size: "~455 MB",
    recommended: true,
  },
  {
    id: "qwen3-asr-1.7b-8bit",
    name: "Qwen3 ASR 1.7B",
    summary:
      "The most accurate open model on the Open ASR Leaderboard, with 30 languages and automatic language detection.",
    provider: "MLX Audio",
    icon: "model-qwen.png",
    size: "~2.5 GB",
  },
  {
    id: "parakeet-unified-en-0.6b",
    name: "Parakeet Unified 0.6B",
    summary: "Live English transcription as you speak, running locally on Apple Silicon.",
    provider: "NVIDIA",
    icon: "model-nvidia.png",
    size: "~625 MB",
    supportsLiveTranscription: true,
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper Large V3 Turbo",
    summary: "OpenAI's speed-optimized Whisper with near-large accuracy across 99 languages.",
    provider: "WhisperKit",
    icon: "model-openai.png",
    size: "~1.1 GB",
  },
  {
    id: "voxtral-realtime-4b-2602-4bit",
    name: "Voxtral Realtime 4B",
    summary: "Mistral's latest streaming transcription model with 13-language support and sub-second delay.",
    provider: "Voxtral Core",
    icon: "model-voxtral.png",
    size: "~3.2 GB",
  },
];

const PROVIDER_ICONS: Record<string, string> = {
  "Apple Speech": "model-swift.png",
  NVIDIA: "model-nvidia.png",
  "MLX Audio": "model-qwen.png",
  WhisperKit: "model-openai.png",
  "Voxtral Core": "model-voxtral.png",
};

export function iconForProvider(provider: string) {
  return PROVIDER_ICONS[provider] ?? "petal-icon.png";
}

export function expandHomeDirectory(path: string) {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }

  if (path === "~") {
    return homedir();
  }

  return path;
}

export function getDirectoryPreferences() {
  const preferences = getPreferenceValues<Preferences>();

  return {
    historyDirectory: expandHomeDirectory(preferences.historyDir || DEFAULT_HISTORY_DIR),
    modelsDirectory: expandHomeDirectory(preferences.modelsDir || DEFAULT_MODELS_DIR),
  };
}

export function getHistoryDirectoryPath() {
  return getDirectoryPreferences().historyDirectory;
}

export function getModelsDirectoryPath() {
  return getDirectoryPreferences().modelsDirectory;
}

export function getHistoryFilePath(historyDirectory = getHistoryDirectoryPath()) {
  return join(historyDirectory, "history.json");
}

export function modelIconForModelID(modelID: string) {
  const known = PETAL_MODELS.find((model) => model.id === modelID)?.icon;
  if (known) return known;
  const id = modelID.toLowerCase();
  if (id.includes("parakeet")) return "model-nvidia.png";
  if (id.includes("qwen")) return "model-qwen.png";
  if (id.includes("whisper")) return "model-openai.png";
  if (id.includes("voxtral") || id.includes("mini-3b")) return "model-voxtral.png";
  if (id.includes("apple")) return "model-swift.png";
  return "petal-icon.png";
}

export function getModelCatalogPath(historyDirectory = getHistoryDirectoryPath()) {
  return join(dirname(historyDirectory), "model-catalog.json");
}

export function loadPetalModels(catalogPath = getModelCatalogPath()): PetalModel[] {
  if (!existsSync(catalogPath)) return PETAL_MODELS;
  try {
    const entries: unknown = JSON.parse(readFileSync(catalogPath, "utf8"));
    if (!Array.isArray(entries)) return PETAL_MODELS;
    const models = entries.filter(isCatalogEntry).map((entry) => ({
      id: entry.id,
      name: entry.name,
      summary: entry.summary,
      provider: entry.provider,
      icon: iconForProvider(entry.provider),
      size: entry.size ?? undefined,
      recommended: entry.isRecommended ?? false,
      isDownloaded: entry.isDownloaded,
      supportsLiveTranscription: entry.supportsLiveTranscription ?? false,
    }));
    return models.length > 0 ? models : PETAL_MODELS;
  } catch {
    return PETAL_MODELS;
  }
}

function isCatalogEntry(value: unknown): value is PetalModelCatalogEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return ["id", "name", "summary", "provider"].every((key) => typeof entry[key] === "string");
}

export async function isPetalInstalled() {
  const applications = await getApplications();
  return applications.some(({ bundleId }) => bundleId === PETAL_BUNDLE_ID);
}

export async function checkPetalInstallation() {
  const isInstalled = await isPetalInstalled();
  if (!isInstalled) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Petal is not installed",
      message: "Install from github.com/Aayush9029/petal",
      primaryAction: {
        title: "Open GitHub",
        onAction: async (toast) => {
          await open("https://github.com/Aayush9029/petal/releases/latest");
          await toast.hide();
        },
      },
    });
  }
  return isInstalled;
}

export async function openPetalDeepLink(command: "start" | "stop" | "setup" | "toggle") {
  await open(`petal://${command}`, PETAL_BUNDLE_ID);
}

export function resolveHistoryPath(relativePath?: string | null, historyDirectory = getHistoryDirectoryPath()) {
  if (!relativePath) return null;
  const base = resolve(historyDirectory);
  const candidate = resolve(base, relativePath);
  if (candidate === base || candidate.startsWith(`${base}${sep}`)) {
    return candidate;
  }
  return null;
}

export async function readDefaultString(key: string) {
  try {
    const { stdout } = await execFileAsync("defaults", ["read", PETAL_DEFAULTS_DOMAIN, key], { encoding: "utf8" });
    return stdout.trim();
  } catch {
    return "";
  }
}

export async function writeDefaultString(key: string, value: string) {
  await execFileAsync("defaults", ["write", PETAL_DEFAULTS_DOMAIN, key, value], { encoding: "utf8" });
}
