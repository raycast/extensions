export type RewriteMode = "natural" | "punchy" | "short" | "reply";

export type Preferences = {
  apiKey: string;
  model: string;
  networkMode: "auto" | "proxy" | "direct";
  proxyUrl?: string;
};

export type RewriteArguments = {
  text: string;
};

export type HistoryStatus = "pending" | "success" | "error";

export type ErrorCategory =
  "timeout" | "proxy" | "network" | "quota" | "api_key" | "model" | "request" | "unknown";

export type HistoryEntry = {
  id: string;
  sourceText: string;
  normalizedSourceText: string;
  mode: RewriteMode;
  status: HistoryStatus;
  outputText?: string;
  errorCategory?: ErrorCategory;
  errorMessage?: string;
  attempts: number;
  createdAt: number;
  updatedAt: number;
  lastAttemptAt: number;
};

export type GeminiResponse = {
  candidates?: Array<{
    finishReason?: string;
    content?: {
      parts?: Array<{
        text?: string;
        thought?: boolean;
      }>;
    };
  }>;
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
};
