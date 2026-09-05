export const providers = ["openrouter", "openai", "anthropic", "gemini"] as const;

export type Provider = (typeof providers)[number];

export interface ProviderConfig {
  provider: Provider;
  model: string;
  apiKey: string;
}

export const vaultRootFolder = ".";

export interface ObsidianVault {
  name: string;
  path: string;
}

export interface VaultProfile {
  candidateFolders: string[];
  context: string;
}

export interface Classification {
  title: string;
  folder: string;
  confidence: number;
}

export interface CreatedNote {
  absolutePath: string;
  relativePath: string;
}

export interface RecentCapture extends CreatedNote {
  title: string;
  vaultPath: string;
  createdAt: string;
}
