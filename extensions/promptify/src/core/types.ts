// Core type definitions for Promptify

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  tags: string[];
  isBuiltIn: boolean;
  createdAt?: number;
  updatedAt?: number;
  examples?: PresetExample[];
}

export interface PresetExample {
  input: string;
  expectedOutput: string;
  description: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  presetId: string;
  input: string;
  output: string;
  metadata: {
    provider: string;
    model?: string;
    processingTime: number;
  };
}

export interface AppSettings {
  provider: "ollama" | "openai";
  ollama: {
    url: string;
    model: string;
    timeout: number;
  };
  openai: {
    apiKey?: string;
    baseUrl?: string;
    model: string;
  };
  ui: {
    autoPaste: boolean;
    saveToHistory: boolean;
    maxHistoryItems: number;
  };
  lastSelectedPresetId?: string;
}

// Re-export error types from utils
export { AppError, ClipboardError, ProviderError, NetworkError, ValidationError, StorageError } from "../utils/errors";

export interface AIProvider {
  name: string;
  enhance(prompt: string, preset: PresetConfig): Promise<string>;
  isAvailable(): Promise<boolean>;
  getModels?(): Promise<string[]>;
}

export interface EnhancementRequest {
  input: string;
  preset: PresetConfig;
  provider: string;
}

export interface EnhancementResult {
  input: string;
  output: string;
  preset: PresetConfig;
  metadata: {
    provider: string;
    model?: string;
    processingTime: number;
    timestamp: number;
  };
}
