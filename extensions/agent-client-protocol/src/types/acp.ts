/**
 * Agent Client Protocol Interface Definitions
 *
 * These interfaces define the contract between the Raycast extension
 * and ACP-compatible agents following the official ACP specification.
 */

// Core ACP Protocol Types
export interface ACPRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface ACPResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface ACPNotification {
  jsonrpc: "2.0";
  method: string;
  params?: Record<string, unknown>;
}

// Initialization Methods
export interface InitializeRequest {
  protocolVersion: number;
  clientCapabilities: ClientCapabilities;
}

export interface InitializeResponse {
  protocolVersion: number;
  agentCapabilities: AgentCapabilities;
}

export interface ClientCapabilities {
  fs?: {
    readTextFile?: boolean;
    writeTextFile?: boolean;
  };
  terminal?: boolean;
}

export interface AgentCapabilities {
  loadSession?: boolean;
  setMode?: boolean;
  fileOperations?: boolean;
  toolCalls?: boolean;
}

// Session Management
export interface NewSessionRequest {
  cwd: string;
  mcpServers?: MCPServer[];
  mode?: string;
}

export interface NewSessionResponse {
  sessionId: string;
  modes?: {
    currentModeId: string;
    availableModes: SessionMode[];
  };
}

export interface SessionMode {
  id: string;
  name: string;
  description?: string | null;
}

export interface LoadSessionRequest {
  sessionId: string;
}

export interface LoadSessionResponse {
  sessionId: string;
  messages: SessionMessage[];
}

export interface SetSessionModeRequest {
  sessionId: string;
  modeId: string;
}

export type SetSessionModeResponse = Record<string, never>;

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Prompt and Response
export interface PromptRequest {
  sessionId: string;
  prompt: ContentBlock[];
}

export interface PromptResponse {
  stopReason:
    | "completed"
    | "cancelled"
    | "error"
    | "user_requested"
    | "end_turn"
    | "max_tokens"
    | "max_turn_requests"
    | "refusal";
  messages?: SessionMessage[];
}

export interface ImageContent {
  data: string; // Base64 encoded
  mimeType: string;
}

export interface FileContent {
  path: string;
  content?: string;
  mimeType?: string;
}

// Session Updates (Notifications)
export interface SessionUpdateNotification {
  sessionId: string;
  update: SessionUpdate;
}

export type SessionUpdate =
  | AgentMessageChunk
  | UserMessageChunk
  | AgentThoughtChunk
  | ToolCall
  | ToolCallUpdate
  | PlanUpdate
  | AvailableCommandsUpdate
  | CurrentModeUpdate;

export interface AgentMessageChunk {
  sessionUpdate: "agent_message_chunk";
  content: MessageContent;
}

export interface UserMessageChunk {
  sessionUpdate: "user_message_chunk";
  content: MessageContent;
}

export interface AgentThoughtChunk {
  sessionUpdate: "agent_thought_chunk";
  content: MessageContent;
}

export type LegacyMessageContent =
  | { type: "text"; text: string }
  | { type: "code"; code: string; language?: string }
  | { type: "file"; filename: string; content?: string; language?: string }
  | { type: "error"; error: string; details?: string };

export type ContentWrapper =
  | { type: "content"; content: ContentBlock }
  | { type: "diff"; path: string; newText: string; oldText?: string | null; _meta?: Record<string, unknown> }
  | { type: "terminal"; terminalId: string; _meta?: Record<string, unknown> };

export type MessageContent =
  | ContentBlock
  | LegacyMessageContent
  | ContentWrapper
  | { type: string; [key: string]: unknown };

// Tool Calls
export type ToolCallStatus = "pending" | "in_progress" | "completed" | "failed";

export type ToolKind =
  | "read"
  | "edit"
  | "delete"
  | "move"
  | "search"
  | "execute"
  | "think"
  | "fetch"
  | "switch_mode"
  | "other";

export type ContentBlock =
  | {
      type: "text";
      text: string;
      annotations?: Record<string, unknown> | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "image";
      data: string;
      mimeType: string;
      annotations?: Record<string, unknown> | null;
      uri?: string | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "audio";
      data: string;
      mimeType: string;
      annotations?: Record<string, unknown> | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "resource_link";
      uri: string;
      name?: string | null;
      description?: string | null;
      mimeType?: string | null;
      size?: number | null;
      title?: string | null;
      annotations?: Record<string, unknown> | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "resource";
      resource: Record<string, unknown>;
      annotations?: Record<string, unknown> | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: string;
      [key: string]: unknown;
    };

export type ToolCallContent =
  | {
      type: "content";
      content: ContentBlock;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "diff";
      path: string;
      newText: string;
      oldText?: string | null;
      _meta?: Record<string, unknown>;
    }
  | {
      type: "terminal";
      terminalId: string;
      _meta?: Record<string, unknown>;
    };

export type ToolCallLocation = Record<string, unknown>;

export interface ToolCall {
  sessionUpdate: "tool_call";
  toolCallId: string;
  title: string;
  status?: ToolCallStatus;
  kind?: ToolKind;
  content?: ToolCallContent[];
  locations?: ToolCallLocation[];
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
}

export interface ToolCallUpdate {
  sessionUpdate: "tool_call_update";
  toolCallId: string;
  status?: ToolCallStatus | null;
  title?: string | null;
  kind?: ToolKind | null;
  content?: ToolCallContent[] | null;
  locations?: ToolCallLocation[] | null;
  rawInput?: Record<string, unknown>;
  rawOutput?: Record<string, unknown>;
}

// Plans
export interface PlanUpdate {
  sessionUpdate: "plan";
  entries: PlanEntry[];
}

export interface PlanEntry {
  content: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in_progress" | "completed";
}

// Available commands
export interface AvailableCommandsUpdate {
  sessionUpdate: "available_commands_update";
  availableCommands: AvailableCommand[];
}

export interface AvailableCommand {
  name: string;
  description: string;
  input?: Record<string, unknown> | null;
}

// Mode updates
export interface CurrentModeUpdate {
  sessionUpdate: "current_mode_update";
  currentModeId: string;
}

// Permission Requests
export interface RequestPermissionRequest {
  toolCall: {
    title: string;
    description?: string;
    params: Record<string, unknown>;
  };
  options: PermissionOption[];
}

export interface PermissionOption {
  optionId: string;
  name: string;
  kind: "allow" | "deny" | "allow_once" | "allow_always";
}

export type RequestPermissionResponse =
  | {
      outcome: {
        outcome: "selected";
        optionId: string;
      };
    }
  | {
      outcome: {
        outcome: "cancelled";
      };
    };

// File System Operations
export interface ReadTextFileRequest {
  path: string;
}

export interface ReadTextFileResponse {
  content: string;
}

export interface WriteTextFileRequest {
  path: string;
  content: string;
}

export type WriteTextFileResponse = Record<string, never>;

// Session Messages
export interface SessionMessage {
  id: string;
  type: "user" | "agent" | "system";
  content: MessageContent[];
  timestamp: number;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  stopReason?: string;
  toolCalls?: string[]; // Tool call IDs
}

// Error Codes (following JSON-RPC 2.0)
export enum ACPErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603,

  // ACP-specific errors
  ProtocolVersionMismatch = -32000,
  SessionNotFound = -32001,
  AgentUnavailable = -32002,
  PermissionDenied = -32003,
  FileNotFound = -32004,
  InvalidSession = -32005,
}
