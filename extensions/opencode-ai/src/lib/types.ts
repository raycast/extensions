/**
 * Types for the OpenCode Raycast extension
 */

export interface Model {
  id: string;
  name: string;
  providerId: string;
}

export interface ModelGroup {
  providerId: string;
  providerName: string;
  models: Model[];
}

export interface Provider {
  id: string;
  name: string;
  models: Model[];
}

export interface QueryResult {
  text: string;
  sessionId: string;
}

export interface ServerStatus {
  running: boolean;
  version?: string;
  error?: string;
}

/**
 * Token usage information from a message response
 */
export interface TokenInfo {
  input: number;
  output: number;
  reasoning: number;
  cache: {
    read: number;
    write: number;
  };
}

/**
 * Information about a completed message response
 */
export interface MessageInfo {
  messageId: string;
  sessionId: string;
  tokens: TokenInfo;
  cost: number;
  timeMs: number;
  modelId: string;
  providerId: string;
}

/**
 * State for streaming responses
 */
export interface StreamingState {
  streamedText: string;
  isStreaming: boolean;
  error: string | null;
  messageInfo: MessageInfo | null;
}

/**
 * Permission request from OpenCode when a tool needs confirmation
 */
export interface PermissionRequest {
  id: string;
  sessionID: string;
  permission: string;
  patterns: string[];
  metadata: Record<string, unknown>;
  always: string[];
  tool?: {
    messageID: string;
    callID: string;
  };
}

/**
 * User's response to a permission request
 */
export type PermissionReply = "once" | "always" | "reject";
