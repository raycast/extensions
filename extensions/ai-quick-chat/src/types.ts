export type MessageRole = "user" | "assistant";

export type MessageStatus = "complete" | "streaming" | "interrupted" | "error";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  reasoning?: string;
  status: MessageStatus;
  createdAt: string;
}

export interface ProviderProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModelId: string;
  systemPrompt: string;
  models: string[];
  lastModelSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelSelection {
  providerId: string;
  modelId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  modelId: string;
  systemPrompt: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SessionMetadata {
  id: string;
  title: string;
  providerId: string;
  providerName: string;
  modelId: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  bytes: number;
}

export interface HistorySettings {
  sessionLimit: number | "unlimited";
}

export interface StorageStats {
  sessionCount: number;
  bytes: number;
  maxBytes: number;
}
