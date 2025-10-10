/**
 * Data Model Entities for Agent Client Protocol Raycast Extension
 *
 * These types define the core data structures used throughout the extension
 * based on the data model specification.
 */

import type { AgentCapabilities } from "./acp";

// Agent Connection Entity
export interface AgentConnection {
  id: string;
  name: string;
  endpoint: string; // command/args for subprocess, URL for remote
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  capabilities: AgentCapabilities;
  protocolVersion: number;
  lastSeen: Date;
  connectionType: 'subprocess' | 'remote';
  errorMessage?: string;
}

// Conversation Session Entity
export interface ConversationSession {
  sessionId: string;
  agentConnectionId: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'archived' | 'error';
  context: ProjectContext[];
}

// Message Entity
export interface Message {
  id: string;
  sessionId: string;
  type: 'user' | 'agent' | 'system';
  content: MessageContent[];
  timestamp: Date;
  status: 'sending' | 'sent' | 'failed';
  metadata: MessageMetadata;
}

export type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'code'; code: string; language?: string }
  | { type: 'file'; filename: string; content: string }
  | { type: 'error'; error: string; details?: string };

export interface MessageMetadata {
  tokensUsed?: number;
  processingTime?: number;
  stopReason?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  description?: string;
  input?: Record<string, unknown>;
  output?: unknown;
}

// Project Context Entity
export interface ProjectContext {
  id: string;
  sessionId: string;
  type: 'file' | 'directory' | 'selection';
  path: string; // absolute path
  content?: string; // file content (for file type)
  language?: string; // programming language detected
  addedAt: Date;
  size: number; // content size in bytes
}

// Agent Configuration Entity
export interface AgentConfiguration {
  defaultAgent: string;
  agentCommands: Record<string, AgentCommand>;
  preferences: UserPreferences;
  security: SecuritySettings;
}

export interface AgentCommand {
  name: string;
  command: string;
  args: string[];
  workingDirectory?: string;
  environmentVariables?: Record<string, string>;
}

export interface UserPreferences {
  maxMessageHistory: number; // Default: 100
  autoSaveConversations: boolean; // Default: true
  showTypingIndicator: boolean; // Default: true
  theme: 'auto' | 'light' | 'dark'; // Default: 'auto'
}

export interface SecuritySettings {
  allowFileAccess: boolean; // Default: false
  allowedDirectories: string[]; // Whitelisted paths
  requirePermissionForTools: boolean; // Default: true
}

// Error Entity
export interface ExtensionError {
  id: string;
  type: 'connection' | 'protocol' | 'validation' | 'system';
  message: string; // User-friendly error message
  details: string; // Technical error details
  timestamp: Date;
  resolved: boolean;
  context: ErrorContext;
}

export interface ErrorContext {
  sessionId?: string;
  agentId?: string;
  operation?: string;
  stackTrace?: string;
  userAgent?: string;
}

// Storage Keys Constants
export const STORAGE_KEYS = {
  AGENT_CONFIGS: "acp.agents",
  CONVERSATIONS: "acp.conversations",
  PREFERENCES: "acp.preferences",
  ACTIVE_SESSIONS: "acp.sessions",
  DEFAULT_AGENT: "acp.defaultAgent",
  SECURITY_SETTINGS: "acp.security"
} as const;

// Validation Types
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// State Types for UI Components
export interface ConnectionState {
  isConnecting: boolean;
  isConnected: boolean;
  error?: string;
  lastAttempt?: Date;
}

export interface ConversationState {
  isLoading: boolean;
  isStreaming: boolean;
  isSending: boolean;
  error?: string;
  currentMessage?: string;
}

export interface AgentSelectorState {
  availableAgents: AgentConnection[];
  selectedAgent?: string;
  isLoading: boolean;
  error?: string;
}

// Built-in Agent Configurations
export const BUILT_IN_AGENTS: Readonly<AgentCommand[]> = [
  {
    name: "Gemini CLI",
    command: "gemini",
    args: ["--acp"],
    workingDirectory: process.cwd(),
    environmentVariables: {}
  }
] as const;