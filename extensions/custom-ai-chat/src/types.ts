export type Role = "user" | "assistant";

export type MessageStatus = "streaming" | "done" | "cancelled" | "error" | "interrupted";

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  tokens?: number;
  modelName?: string;
  status?: MessageStatus;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

export interface ModelRef {
  key: string;
  providerId: string;
  providerName: string;
  modelId: string;
  modelName: string;
  baseUrl: string;
  apiKey?: string;
  apiKeyAlias?: string;
}

export type CatalogStatus = "ready" | "missing" | "io-error" | "parse-error" | "empty";

export type CatalogResult =
  | { status: "ready"; path: string; models: ModelRef[]; issues: string[] }
  | { status: Exclude<CatalogStatus, "ready">; path: string; message: string; issues?: string[] };
