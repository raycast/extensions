export interface AnkiConnectRequest {
  action: string;
  version: number;
  params?: Record<string, unknown>;
}

export interface AnkiConnectResponse<T = unknown> {
  result: T;
  error: string | null;
}

export interface AnkiNote {
  deckName: string;
  modelName: string;
  fields: {
    Front?: string;
    Back?: string;
    Text?: string;
    "Back Extra"?: string;
  };
  tags?: string[];
  options?: {
    allowDuplicate?: boolean;
    duplicateScope?: string;
  };
}

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Preferences {
  deepseekApiKey: string;
  ankiDeck: string;
  ankiConnectUrl: string;
  noteType: string;
}
