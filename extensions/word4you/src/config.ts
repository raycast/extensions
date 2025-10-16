import { getPreferenceValues, environment } from "@raycast/api";
import path from "path";
import os from "os";
import fs from "fs";

export interface Preferences {
  aiProvider: string;
  geminiApiKey: string;
  geminiModelName: string;
  qwenApiKey: string;
  qwenModelName: string;
  vocabularyBaseDir: string;
  gitEnabled: boolean;
  gitRemoteUrl: string;
}

// CLI Download Configuration
export const CLI_CONFIG = {
  // GitHub release version and base URL
  version: "v1.1.0",
  baseUrl: "https://github.com/gnehz972/word4you/releases/download",

  // Platform-specific asset names
  assets: {
    "darwin-arm64": "word4you-aarch64-apple-darwin",
    "darwin-x64": "word4you-x86_64-apple-darwin",
  },

  // Expected SHA256 hashes for verification
  hashes: {
    "word4you-aarch64-apple-darwin": "860ffc91d20c31eb58794ed4bc672d89a5fb7337364fbb72397acc68501e8bad",
    "word4you-x86_64-apple-darwin": "7f8da53c327de6842bac116c801896036831d5d7ad489c16420c3a26ece8064c",
  },
} as const;

// Get the path to the Word4You CLI executable
export function getCliFilepath(): string {
  const dir = path.join(environment.supportPath, "cli");
  return path.join(dir, "word4you");
}

// Get download URL for current platform
export function getDownloadUrl(): { url: string; assetName: string; expectedHash: string } {
  const platform = os.platform();
  const arch = os.arch();

  // Only support macOS
  if (platform !== "darwin") {
    throw new Error(`Unsupported platform: ${platform}. Only macOS is supported.`);
  }

  // Map platform and architecture to asset name
  let platformKey: keyof typeof CLI_CONFIG.assets;

  if (platform === "darwin") {
    platformKey = arch === "arm64" ? "darwin-arm64" : "darwin-x64";
  } else {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const assetName = CLI_CONFIG.assets[platformKey];
  const url = `${CLI_CONFIG.baseUrl}/${CLI_CONFIG.version}/${assetName}`;
  const expectedHash = CLI_CONFIG.hashes[assetName];

  return { url, assetName, expectedHash };
}

// Get the vocabulary path using the base directory from preferences
export function getVocabularyPath(): string {
  const preferences = getPreferenceValues();
  let baseDir = preferences.vocabularyBaseDir || "~";

  // Expand ~ to home directory
  if (baseDir.startsWith("~")) {
    baseDir = baseDir.replace("~", os.homedir());
  }

  return path.join(baseDir, "word4you", "vocabulary_notebook.md");
}

// Ensure directory exists for vocabulary file
export function ensureVocabularyDirectoryExists(vocabularyPath: string): void {
  try {
    const dir = path.dirname(vocabularyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.error("Error creating vocabulary directory:", err);
  }
}

// Check if user has configured their AI provider and API key
export function isProviderConfigured(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  const provider = preferences.aiProvider || "gemini";
  return (provider === "gemini" && !!preferences.geminiApiKey) || (provider === "qwen" && !!preferences.qwenApiKey);
}

// Create environment variables from preferences
export function createEnvironmentFromPreferences(): NodeJS.ProcessEnv {
  const preferences = getPreferenceValues<Preferences>();

  return {
    ...process.env,
    // Pass Raycast preferences as environment variables for the CLI
    WORD4YOU_AI_PROVIDER: preferences.aiProvider || "gemini",
    WORD4YOU_GEMINI_API_KEY: preferences.geminiApiKey || "",
    WORD4YOU_GEMINI_MODEL_NAME: preferences.geminiModelName || "gemini-2.0-flash-001",
    WORD4YOU_QWEN_API_KEY: preferences.qwenApiKey || "",
    WORD4YOU_QWEN_MODEL_NAME: preferences.qwenModelName || "qwen-turbo",
    WORD4YOU_VOCABULARY_BASE_DIR: preferences.vocabularyBaseDir || "~",
    WORD4YOU_GIT_ENABLED: preferences.gitEnabled ? "true" : "false",
    WORD4YOU_GIT_REMOTE_URL: preferences.gitRemoteUrl || "",
  };
}
