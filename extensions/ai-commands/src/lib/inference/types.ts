import { RaycastImage } from "../types";

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

/** Provider-neutral conversation data persisted by the application. */
export interface ChatMessage {
  role: MessageRole;
  content: string;
  reasoning?: string;
  images?: RaycastImage[];
  toolCalls?: ToolCall[];
  toolName?: string;
  toolCallId?: string;
}

export interface InferenceMetadata {
  model?: string;
  createdAt?: string;
  inputTokens?: number;
  outputTokens?: number;
}
