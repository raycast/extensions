import { HttpClient } from "./http";

export interface AccountSummary {
  success: true;
  data: {
    username: string;
    display_name: string;
    avatar_url?: string;
    wallet: {
      quota: number;
      currency: string;
    };
    oauth_token: {
      expires_at: number;
    };
    usage: {
      today: UsagePeriod;
      last_7_days: UsagePeriod;
      top_models: Array<{ model: string; requests: number; quota: number }>;
    };
  };
}

export interface UsagePeriod {
  requests: number;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
}

export interface ModelInfo {
  id: string;
  object?: string;
  owned_by?: string;
  context_length?: number;
  input_price?: number;
  output_price?: number;
}

export interface ModelsResponse {
  object: "list";
  data: ModelInfo[];
}

export interface LogRow {
  id: number;
  request_id?: string;
  created_at: number;
  model_name: string;
  token_name: string;
  channel_name: string;
  quota: number;
  prompt_tokens: number;
  completion_tokens: number;
  use_time: number;
  is_stream: boolean;
  content?: string;
}

export interface LogsResponse {
  success: boolean;
  message?: string;
  data: LogRow[];
}

export interface UpstreamStatusResponse {
  success: boolean;
  data: { providers: unknown[] };
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  choices: Array<{
    message: { role: "assistant"; content: string };
    finish_reason?: string;
  }>;
}

export class EveryApi {
  constructor(private readonly http: HttpClient) {}

  account(): Promise<AccountSummary> {
    return this.http.get("/api/usage/account");
  }

  models(): Promise<ModelsResponse> {
    return this.http.get("/v1/models");
  }

  logs(): Promise<LogsResponse> {
    return this.http.get("/api/log/token");
  }

  upstreamStatus(): Promise<UpstreamStatusResponse> {
    return this.http.get("/api/upstream-status", { authenticated: false });
  }

  chatCompletion(input: {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
  }): Promise<ChatCompletionResponse> {
    return this.http.post("/v1/chat/completions", {
      ...input,
      stream: false,
    });
  }
}
