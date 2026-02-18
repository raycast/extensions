// ── Tool calling types (OpenAI-compatible) ──────────────────────────────

export interface ToolFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface Tool {
  type: "function";
  function: ToolFunction;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string — must JSON.parse()
  };
}

// ── Chat message types ──────────────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** File paths to attached images (for multimodal / vision models). */
  images?: string[];
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
}

export interface ChatResponse {
  id: string;
  choices: {
    message: ChatMessage;
    finish_reason: string; // "stop" | "tool_calls" | "length"
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatStreamChunk {
  id: string;
  choices: {
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
  }[];
}

// ── Model / provider types ──────────────────────────────────────────────

export interface Model {
  id: string;
  name: string;
  owned_by?: string;
  /** Ollama-specific metadata from /api/tags */
  parameterSize?: string;
  quantizationLevel?: string;
  family?: string;
  families?: string[];
  format?: string;
  diskSize?: number;
  maxContextLength?: number;
  supportsVision?: boolean;
}

export interface ModelsResponse {
  data: Model[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

export type ProviderType = "ollama" | "lmstudio" | "llamacpp" | "custom";

export interface ProviderConfig {
  type: ProviderType;
  baseUrl: string;
  defaultModel: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
  streamResponses: boolean;
}
