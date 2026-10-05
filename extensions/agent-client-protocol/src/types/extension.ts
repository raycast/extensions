/**
 * Raycast Extension API Contracts
 *
 * These interfaces define the contract between internal services
 * and Raycast UI components for the ACP extension.
 */

import type {
  AgentConnection as BaseAgentConnection,
  ConversationSession as BaseConversationSession,
  SessionMessage as BaseSessionMessage,
  SessionRequest,
  MessageRequest,
  ConnectionHealth,
  MessageRole as BaseMessageRole,
  SessionStatistics,
  MessagePagination,
  PaginatedMessages,
} from "./entities";

// Re-export entity types with proper aliases
export type AgentConnection = BaseAgentConnection;
export type ConversationSession = BaseConversationSession;
export type SessionMessage = BaseSessionMessage;
export type MessageRole = BaseMessageRole;

export type {
  SessionRequest,
  MessageRequest,
  ConnectionHealth,
  SessionStatistics,
  MessagePagination,
  PaginatedMessages,
};

// Error codes for consistent error handling
export enum ErrorCode {
  // Agent-related errors
  AgentUnavailable = "AGENT_UNAVAILABLE",
  AgentConnectionFailed = "AGENT_CONNECTION_FAILED",

  // Protocol-related errors
  ProtocolError = "PROTOCOL_ERROR",

  // Session-related errors
  SessionNotFound = "SESSION_NOT_FOUND",
  InvalidSession = "INVALID_SESSION",
  SessionExpired = "SESSION_EXPIRED",

  // File-related errors
  FileNotFound = "FILE_NOT_FOUND",
  FileAccessDenied = "FILE_ACCESS_DENIED",
  InvalidFilePath = "INVALID_FILE_PATH",

  // Configuration errors
  InvalidConfiguration = "INVALID_CONFIGURATION",
  MissingConfiguration = "MISSING_CONFIGURATION",

  // System errors
  NetworkError = "NETWORK_ERROR",
  SystemError = "SYSTEM_ERROR",
  UnknownError = "UNKNOWN_ERROR",
}

// Extension error interface
export interface ExtensionError {
  code: ErrorCode;
  message: string;
  details: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

// Main Extension Commands
export interface ACPExtensionCommands {
  // Start new agent conversation
  startAgent(): Promise<void>;

  // Open existing conversation
  openConversation(sessionId: string): Promise<void>;

  // Manage agent connections
  manageAgents(): Promise<void>;
}

// Agent Management Service
export interface AgentServiceInterface {
  // Connection management
  connectToAgent(agentId: string): Promise<AgentConnection>;
  disconnectAgent(connectionId: string): Promise<void>;
  getConnection(connectionId: string): Promise<AgentConnection | null>;
  getActiveConnections(): Promise<AgentConnection[]>;

  // Health monitoring
  getConnectionHealth(connectionId: string): Promise<ConnectionHealth>;
  reconnectAgent(connectionId: string): Promise<AgentConnection>;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: "subprocess" | "remote";
  command?: string;
  args?: string[];
  endpoint?: string;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  appendToPath?: string[];
  isBuiltIn?: boolean; // For built-in agents like Gemini CLI
  description?: string;
  createdAt: Date;
  lastUsed?: Date;
}

// Session Management Service
export interface SessionServiceInterface {
  // Session lifecycle
  createSession(request: SessionRequest): Promise<ConversationSession>;
  getSession(sessionId: string): Promise<ConversationSession | null>;
  endSession(sessionId: string): Promise<void>;

  // Message management
  sendMessage(
    sessionId: string,
    content: string,
    agent: AgentConfig,
    context?: MessageRequest["context"],
  ): Promise<SessionMessage>;
  getSessionMessages(sessionId: string, offset: number, limit: number): Promise<SessionMessage[]>;

  // Session validation
  validateSession(sessionId: string): Promise<boolean>;

  // Streaming updates
  onSessionMessage(sessionId: string, handler: (message: SessionMessage) => void): void;
  offSessionMessage(sessionId: string): void;
}

export interface MessageContent {
  type: "text" | "code" | "file" | "error";
  content: string;
  language?: string; // For code content
  filename?: string; // For file content
}

export interface ToolCallInfo {
  id: string;
  title: string;
  status: "pending" | "running" | "completed" | "failed";
  description?: string;
}

export interface ProjectContext {
  id: string;
  sessionId: string;
  type: "file" | "directory" | "selection";
  path: string;
  content?: string;
  language?: string;
  addedAt: Date;
  size: number;
}

export interface AgentHealthRecord {
  agentId: string;
  status: "healthy" | "unhealthy";
  lastChecked: Date;
  latencyMs?: number;
  error?: string;
}

// Configuration Service
export interface ConfigurationService {
  // Agent configurations (using Raycast LocalStorage)
  getAgentConfigs(): Promise<AgentConfig[]>;
  saveAgentConfig(config: AgentConfig): Promise<void>;
  deleteAgentConfig(id: string): Promise<void>;
  getDefaultAgent(): Promise<string | null>;
  setDefaultAgent(agentId: string): Promise<void>;

  // User preferences (using Raycast LocalStorage)
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(preferences: Partial<UserPreferences>): Promise<void>;

  // Security settings (using Raycast LocalStorage)
  getSecuritySettings(): Promise<SecuritySettings>;
  updateSecuritySettings(settings: Partial<SecuritySettings>): Promise<void>;

  // Storage utilities
  clearAllData(): Promise<void>;
  exportData(): Promise<string>; // JSON export
  importData(data: string): Promise<void>; // JSON import
}

export interface UserPreferences {
  defaultAgent?: string;
  maxMessageHistory: number;
  autoSaveConversations: boolean;
  showTypingIndicator: boolean;
  theme: "auto" | "light" | "dark";
  copyCodeBlocks: boolean;
  enableNotifications: boolean;
}

export interface SecuritySettings {
  allowFileAccess: boolean;
  allowedDirectories: string[];
  requirePermissionForTools: boolean;
  enableLogging: boolean;
  trustedTools?: string[];
  trustedPaths?: string[];
}

// UI Component Props
export interface ConversationListProps {
  sessions: ConversationSession[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onCreateSession: () => void;
  isLoading: boolean;
}

export interface ConversationViewProps {
  session: ConversationSession;
  onSendMessage: (content: string) => void;
  onAddContext: (filePath: string) => void;
  onCopyMessage: (messageId: string) => void;
  isLoading: boolean;
  isStreaming: boolean;
}

export interface AgentSelectorProps {
  agents: AgentConfig[];
  selectedAgentId?: string;
  onSelectAgent: (agentId: string) => void;
  onConfigureAgent: () => void;
  onTestAgent?: (agentId: string) => void;
  isLoading: boolean;
  healthMap?: Record<string, AgentHealthRecord>;
}

export interface MessageItemProps {
  message: SessionMessage;
  onCopy: () => void;
  onRetry?: () => void;
  showAvatar: boolean;
  isStreaming?: boolean;
}

// Event Types for Service Communication
export interface ServiceEvents {
  // Agent events
  "agent:connected": { connectionId: string };
  "agent:disconnected": { connectionId: string };
  "agent:error": { connectionId: string; error: ExtensionError };

  // Session events
  "session:created": { sessionId: string };
  "session:updated": { sessionId: string };
  "session:deleted": { sessionId: string };

  // Message events
  "message:sent": { sessionId: string; messageId: string };
  "message:received": { sessionId: string; messageId: string };
  "message:streaming": { sessionId: string; messageId: string; chunk: string };

  // Context events
  "context:added": { sessionId: string; contextId: string };
  "context:removed": { sessionId: string; contextId: string };
}

// Utility Types
export type AsyncResult<T> = Promise<{ success: true; data: T } | { success: false; error: ExtensionError }>;

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  cursor?: string;
}

export interface SearchOptions {
  query: string;
  limit?: number;
  offset?: number;
  sortBy?: "relevance" | "date";
  filters?: Record<string, unknown>;
}
