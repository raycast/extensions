import { RaycastImage } from "../types";

export enum MessageRole {
  SYSTEM = "system",
  USER = "user",
  ASSISTANT = "assistant",
  TOOL = "tool",
}

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
  /** Read-only aliases accepted when loading older persisted tool results. */
  tool_name?: string;
  tool_call_id?: string;
}

export interface InferenceMetadata {
  model?: string;
  createdAt?: string;
  inputTokens?: number;
  outputTokens?: number;
}
