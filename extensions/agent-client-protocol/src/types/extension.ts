/**
 * Raycast Extension API Contracts
 *
 * These interfaces define the contract between internal services
 * and Raycast UI components for the ACP extension.
 */

import type { AgentCapabilities } from "./acp";

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
export interface AgentService {
  // Connection management
  connect(config: AgentConfig): Promise<AgentConnection>;
  disconnect(connectionId: string): Promise<void>;
  getConnection(connectionId: string): Promise<AgentConnection | null>;
  listConnections(): Promise<AgentConnection[]>;

  // Health monitoring
  healthCheck(connectionId: string): Promise<boolean>;
  reconnect(connectionId: string): Promise<AgentConnection>;
}

export interface AgentConfig {
  id: string;
  name: string;
  type: 'subprocess' | 'remote';
  command?: string;
  args?: string[];
  endpoint?: string;
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
  isBuiltIn?: boolean; // For built-in agents like Gemini CLI
  description?: string;
  createdAt: Date;
  lastUsed?: Date;
}

export interface AgentConnection {
  id: string;
  name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  capabilities: AgentCapabilities;
  protocolVersion: number;
  lastSeen: Date;
  errorMessage?: string;
}

// Session Management Service
export interface SessionService {
  // Session lifecycle
  createSession(agentId: string, title?: string): Promise<ConversationSession>;
  loadSession(sessionId: string): Promise<ConversationSession | null>;
  deleteSession(sessionId: string): Promise<void>;
  listSessions(agentId?: string): Promise<ConversationSession[]>;

  // Message management
  sendMessage(sessionId: string, content: string): Promise<void>;
  addContextFile(sessionId: string, filePath: string): Promise<void>;
  clearHistory(sessionId: string): Promise<void>;

  // Session state
  updateSessionTitle(sessionId: string, title: string): Promise<void>;
  archiveSession(sessionId: string): Promise<void>;
}

export interface ConversationSession {
  sessionId: string;
  agentConnectionId: string;
  title: string;
  messages: SessionMessage[];
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'archived' | 'error';
  context: ProjectContext[];
}

export interface SessionMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'agent' | 'system';
  content: MessageContent[];
  timestamp: Date;
  status: 'sending' | 'sent' | 'failed';
  metadata?: MessageMetadata;
}

export interface MessageContent {
  type: 'text' | 'code' | 'file' | 'error';
  content: string;
  language?: string; // For code content
  filename?: string; // For file content
}

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  stopReason?: string;
  toolCalls?: ToolCallInfo[];
}

export interface ToolCallInfo {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description?: string;
}

export interface ProjectContext {
  id: string;
  sessionId: string;
  type: 'file' | 'directory' | 'selection';
  path: string;
  content?: string;
  language?: string;
  addedAt: Date;
  size: number;
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
  theme: 'auto' | 'light' | 'dark';
  copyCodeBlocks: boolean;
  enableNotifications: boolean;
}

export interface SecuritySettings {
  allowFileAccess: boolean;
  allowedDirectories: string[];
  requirePermissionForTools: boolean;
  enableLogging: boolean;
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
  agents: AgentConnection[];
  selectedAgent?: string;
  onSelectAgent: (agentId: string) => void;
  onConfigureAgent: () => void;
  isLoading: boolean;
}

export interface MessageItemProps {
  message: SessionMessage;
  onCopy: () => void;
  onRetry?: () => void;
  showAvatar: boolean;
  isStreaming?: boolean;
}

// Error Handling
export interface ExtensionError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export enum ErrorCode {
  // Connection errors
  AgentConnectionFailed = 'AGENT_CONNECTION_FAILED',
  AgentUnavailable = 'AGENT_UNAVAILABLE',
  ProtocolError = 'PROTOCOL_ERROR',

  // Session errors
  SessionNotFound = 'SESSION_NOT_FOUND',
  InvalidSession = 'INVALID_SESSION',
  SessionExpired = 'SESSION_EXPIRED',

  // File system errors
  FileNotFound = 'FILE_NOT_FOUND',
  FileAccessDenied = 'FILE_ACCESS_DENIED',
  InvalidFilePath = 'INVALID_FILE_PATH',

  // Configuration errors
  InvalidConfiguration = 'INVALID_CONFIGURATION',
  MissingConfiguration = 'MISSING_CONFIGURATION',

  // System errors
  NetworkError = 'NETWORK_ERROR',
  SystemError = 'SYSTEM_ERROR',
  UnknownError = 'UNKNOWN_ERROR'
}

// Event Types for Service Communication
export interface ServiceEvents {
  // Agent events
  'agent:connected': { connectionId: string };
  'agent:disconnected': { connectionId: string };
  'agent:error': { connectionId: string; error: ExtensionError };

  // Session events
  'session:created': { sessionId: string };
  'session:updated': { sessionId: string };
  'session:deleted': { sessionId: string };

  // Message events
  'message:sent': { sessionId: string; messageId: string };
  'message:received': { sessionId: string; messageId: string };
  'message:streaming': { sessionId: string; messageId: string; chunk: string };

  // Context events
  'context:added': { sessionId: string; contextId: string };
  'context:removed': { sessionId: string; contextId: string };
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
  sortBy?: 'relevance' | 'date';
  filters?: Record<string, unknown>;
}