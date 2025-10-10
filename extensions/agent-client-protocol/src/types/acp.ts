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
}

export interface LoadSessionRequest {
  sessionId: string;
}

export interface LoadSessionResponse {
  sessionId: string;
  messages: SessionMessage[];
}

export interface MCPServer {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

// Prompt and Response
export interface PromptRequest {
  sessionId: string;
  prompt: PromptContent[];
}

export interface PromptResponse {
  stopReason: "completed" | "cancelled" | "error" | "user_requested";
  messages?: SessionMessage[];
}

export type PromptContent =
  | { type: "text"; text: string }
  | { type: "image"; image: ImageContent }
  | { type: "file"; file: FileContent };

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
  | CommandsUpdate
  | ModeChange;

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

export type MessageContent =
  | { type: "text"; text: string }
  | { type: "code"; code: string; language?: string }
  | { type: "image"; image: ImageContent }
  | { type: "error"; error: string };

// Tool Calls
export interface ToolCall {
  sessionUpdate: "tool_call";
  toolCallId: string;
  title: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed";
  input?: Record<string, unknown>;
  output?: unknown;
}

export interface ToolCallUpdate {
  sessionUpdate: "tool_call_update";
  toolCallId: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
}

// Plans
export interface PlanUpdate {
  sessionUpdate: "plan";
  plan: Plan;
}

export interface Plan {
  title: string;
  description?: string;
  steps: PlanStep[];
}

export interface PlanStep {
  title: string;
  description?: string;
  status: "pending" | "running" | "completed" | "failed";
}

// Commands
export interface CommandsUpdate {
  sessionUpdate: "commands";
  commands: Command[];
}

export interface Command {
  name: string;
  description: string;
  params?: CommandParam[];
}

export interface CommandParam {
  name: string;
  description: string;
  type: "string" | "number" | "boolean";
  required?: boolean;
}

// Mode Changes
export interface ModeChange {
  sessionUpdate: "mode_change";
  mode: string;
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

export interface RequestPermissionResponse {
  outcome: {
    outcome: "selected" | "cancelled";
    optionId?: string;
  };
}

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

export interface WriteTextFileResponse {
  // Empty response on success
}

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