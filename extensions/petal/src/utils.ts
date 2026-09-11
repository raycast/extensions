import { getApplications, getPreferenceValues, open, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import { PetalModel } from "./types";

const execFileAsync = promisify(execFile);

const DEFAULT_HISTORY_DIR = "~/Documents/petal/history";
const DEFAULT_MODELS_DIR = "~/Documents/petal/models";

export const PETAL_BUNDLE_ID = "com.optimalapps.petal";
export const PETAL_DEFAULTS_DOMAIN = "com.optimalapps.petal";

export const PETAL_MODELS: PetalModel[] = [
  {
    id: "apple-speech",
    name: "Apple Speech (Built-in)",
    summary: "Uses Apple's on-device Speech framework. No model download required.",
    provider: "Apple Speech",
    icon: "model-swift.png",
    supportsSmart: false,
  },
  {
    id: "qwen3-asr-0.6b-4bit",
    name: "Qwen3 ASR 0.6B (4-bit)",
    summary: "Recommended for fast, lightweight on-device transcription.",
    provider: "MLX Audio STT",
    icon: "model-qwen.png",
    size: "~1.2 GB",
    supportsSmart: false,
    recommended: true,
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper Large V3 Turbo",
    summary: "High-accuracy Whisper model for multilingual transcription via WhisperKit.",
    provider: "WhisperKit",
    icon: "model-openai.png",
    size: "~1.6 GB",
    supportsSmart: false,
  },
  {
    id: "whisper-tiny",
    name: "Whisper Tiny",
    summary: "Smallest Whisper option for fast, lightweight transcription via WhisperKit.",
    provider: "WhisperKit",
    icon: "model-openai.png",
    size: "~150 MB",
    supportsSmart: false,
  },
  {
    id: "mini-3b",
    name: "Voxtral Mini 3B (bf16)",
    summary: "Accurate on-device transcription with Smart mode support.",
    provider: "Voxtral Core",
    icon: "model-voxtral.png",
    size: "~8.7 GB",
    supportsSmart: true,
  },
  {
    id: "mini-3b-8bit",
    name: "Voxtral Mini 3B (8-bit)",
    summary: "Quantized 3B model for lower memory usage with Smart mode support.",
    provider: "Voxtral Core",
    icon: "model-voxtral.png",
    size: "~4.6 GB",
    supportsSmart: true,
  },
];

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
  return PETAL_MODELS.find((model) => model.id === modelID)?.icon ?? "petal-icon.png";
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
