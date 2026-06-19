export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
export type BodyMode = "key-value" | "raw";
export type ValueType = "string" | "boolean" | "number" | "null";

export interface KeyValueField {
  id: string;
  key: string;
  value: string;
  type: ValueType;
}

export interface WebhookRequest {
  url: string;
  method: HttpMethod;
  bodyMode: BodyMode;
  fields: KeyValueField[];
  rawJson: string;
  headers?: Record<string, string>;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  request: WebhookRequest;
  responseStatus?: number;
  responseBody?: string;
  responseTime?: number;
  error?: string;
}

export interface SavedWebhook {
  id: string;
  name: string;
  createdAt: number;
  request: WebhookRequest;
}
