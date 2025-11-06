import type { AvailableCommand } from "./acp";

/**
 * Core Entity Models for Agent Client Protocol Extension
 *
 * Defines the main data entities used throughout the application:
 * - AgentConnection: Represents active connections to ACP agents
 * - ConversationSession: Represents conversation sessions with agents
 * - Message: Individual messages within conversations
 */

/**
 * Represents an active connection to an ACP agent
 */
export interface AgentConnection {
  /** Unique identifier for this connection */
  id: string;

  /** ID of the agent configuration used for this connection */
  agentId: string;

  /** Current status of the connection */
  status: "connecting" | "connected" | "disconnected" | "error";

  /** When the connection was established */
  connectedAt: Date;

  /** Last activity timestamp */
  lastActivity: Date;

  /** Number of active sessions using this connection */
  sessionCount: number;

  /** Optional error information if status is 'error' */
  error?: {
    code: string;
    message: string;
    details?: string;
  };

  /** Connection metadata */
  metadata?: {
    /** Process ID for subprocess agents */
    processId?: number;
    /** Endpoint URL for remote agents */
    endpoint?: string;
    /** Agent capabilities negotiated during connection */
    capabilities?: string[];
    /** Performance metrics */
    metrics?: {
      averageResponseTime?: number;
      totalRequests?: number;
      errorCount?: number;
    };
  };
}

/**
 * Health status for an agent connection
 */
export interface ConnectionHealth {
  /** Whether the connection is healthy and responsive */
  isHealthy: boolean;

  /** When the health check was performed */
  lastChecked: Date;

  /** Response time in milliseconds */
  responseTime?: number;

  /** Error message if unhealthy */
  error?: string;

  /** Additional health metrics */
  metrics?: {
    /** Memory usage (if available) */
    memoryUsage?: number;
    /** CPU usage (if available) */
    cpuUsage?: number;
    /** Uptime in seconds */
    uptime?: number;
  };
}

/**
 * Request to create a new session
 */
export interface SessionRequest {
  /** ID of the agent connection to use */
  agentConnectionId: string;

  /** ID of the agent configuration used to establish the session */
  agentConfigId?: string;

  /** Initial prompt/message to send to the agent */
  prompt: string;

  /** Context to share with the agent */
  context: {
    /** Current working directory */
    workingDirectory?: string;
    /** Files to share as context */
    files?: string[];
    /** Additional structured context */
    additionalContext?: Record<string, unknown>;
  };

  /** Optional session metadata */
  metadata?: {
    /** Human-readable title for the session */
    title?: string;
    /** Tags for categorization */
    tags?: string[];
    /** Priority level */
    priority?: "low" | "normal" | "high";
  };
}

/**
 * Represents a conversation session with an agent
 */
export interface ConversationSession {
  /** Unique identifier for this session */
  sessionId: string;

  /** ID of the agent connection used for this session */
  agentConnectionId: string;

  /** ID of the agent configuration used for this session */
  agentConfigId: string;

  /** Underlying ACP agent session identifier */
  agentSessionId?: string;

  /** Current status of the session */
  status: "active" | "completed" | "archived" | "error";

  /** When the session was created */
  createdAt: Date;

  /** Last activity timestamp */
  lastActivity: Date;

  /** All messages in this conversation */
  messages: SessionMessage[];

  /** Session metadata */
  metadata?: {
    /** Human-readable title */
    title?: string;
    /** Tags for categorization */
    tags?: string[];
    /** Priority level */
    priority?: "low" | "normal" | "high";
    /** Total token count (if available) */
    tokenCount?: number;
    /** Estimated cost (if available) */
    estimatedCost?: number;
  };

  /** Context shared with the agent for this session */
  context?: {
    /** Working directory */
    workingDirectory?: string;
    /** Files shared as context */
    files?: string[];
    /** Additional context data */
    additionalContext?: Record<string, unknown>;
  };

  /** Current agent mode */
  currentMode?: {
    /** Mode identifier */
    id: string;
    /** Human-readable mode name */
    name: string;
  };

  /** Available modes for this agent session */
  availableModes?: Array<{
    /** Mode identifier */
    id: string;
    /** Human-readable mode name */
    name: string;
    /** Optional description of what this mode does */
    description?: string | null;
  }>;

  /** Available slash commands advertised by the agent */
  availableCommands?: AvailableCommand[];
}

/**
 * Message role types
 */
export type MessageRole = "user" | "assistant" | "system" | "tool";

/**
 * Represents a single message in a conversation
 */
export interface SessionMessage {
  /** Unique identifier for this message */
  id: string;

  /** Role of the message sender */
  role: MessageRole;

  /** Content of the message */
  content: string;

  /** When the message was created */
  timestamp: Date;

  /** Message metadata */
  metadata: {
    /** Source of the message */
    source: "user" | "agent" | "system";
    /** Type of message content */
    messageType: "text" | "code" | "file" | "tool_call" | "tool_result";
    /** Agent ID if from agent */
    agentId?: string;
    /** Token count for this message */
    tokenCount?: number;
    /** Processing time for agent responses */
    processingTime?: number;
    /** Whether message is part of a streaming response */
    isStreaming?: boolean;
    /** Sequence number for ordering */
    sequence?: number;
  };

  /** Optional tool call information */
  toolCall?: {
    /** Name of the tool being called */
    name: string;
    /** Arguments passed to the tool */
    arguments: Record<string, unknown>;
    /** Call ID for correlation */
    callId: string;
  };

  /** Optional tool result information */
  toolResult?: {
    /** Call ID this result corresponds to */
    callId: string;
    /** Result data */
    result: unknown;
    /** Whether the call was successful */
    success: boolean;
    /** Error information if unsuccessful */
    error?: string;
  };

  /** Optional file attachments */
  attachments?: {
    /** File path */
    path: string;
    /** File type/extension */
    type: string;
    /** File size in bytes */
    size: number;
    /** Whether file content is included */
    includeContent: boolean;
  }[];
}

/**
 * Message creation request
 */
export interface MessageRequest {
  /** Content of the message */
  content: string;

  /** Optional message metadata */
  metadata?: Partial<SessionMessage["metadata"]>;

  /** Optional file attachments */
  attachments?: SessionMessage["attachments"];

  /** Context for this specific message */
  context?: {
    /** Files to include with this message */
    files?: string[];
    /** Additional context */
    additionalContext?: Record<string, unknown>;
  };
}

/**
 * Session update event
 */
export interface SessionUpdate {
  /** Session ID being updated */
  sessionId: string;

  /** Type of update */
  type: "message_added" | "message_updated" | "status_changed" | "metadata_updated";

  /** Update payload */
  payload: {
    /** New message if type is message_added */
    message?: SessionMessage;
    /** Updated message if type is message_updated */
    updatedMessage?: SessionMessage;
    /** New status if type is status_changed */
    status?: ConversationSession["status"];
    /** Updated metadata if type is metadata_updated */
    metadata?: ConversationSession["metadata"];
  };

  /** When the update occurred */
  timestamp: Date;
}

/**
 * Statistics for a conversation session
 */
export interface SessionStatistics {
  /** Session ID */
  sessionId: string;

  /** Total number of messages */
  messageCount: number;

  /** Message count by role */
  messagesByRole: Record<MessageRole, number>;

  /** Total token count (if available) */
  totalTokens?: number;

  /** Average response time */
  averageResponseTime?: number;

  /** Session duration */
  duration: number;

  /** Cost estimation (if available) */
  estimatedCost?: number;

  /** Context sharing statistics */
  contextStats: {
    /** Number of files shared */
    filesShared: number;
    /** Total size of shared content */
    totalContentSize: number;
  };
}

/**
 * Pagination parameters for message retrieval
 */
export interface MessagePagination {
  /** Offset from start */
  offset: number;

  /** Maximum number of messages to return */
  limit: number;

  /** Sort order */
  order?: "asc" | "desc";

  /** Filter by role */
  roleFilter?: MessageRole[];

  /** Filter by message type */
  typeFilter?: SessionMessage["metadata"]["messageType"][];
}

/**
 * Paginated message result
 */
export interface PaginatedMessages {
  /** Messages for this page */
  messages: SessionMessage[];

  /** Total number of messages available */
  total: number;

  /** Current offset */
  offset: number;

  /** Number of messages in this page */
  count: number;

  /** Whether there are more messages available */
  hasMore: boolean;
}

/**
 * Type of project context
 */
export type ProjectContextType = "file" | "directory" | "selection";

/**
 * Represents project context shared with an agent
 */
export interface ProjectContext {
  /** Unique identifier for this context */
  id: string;

  /** Session this context belongs to */
  sessionId: string;

  /** Type of context */
  type: ProjectContextType;

  /** Absolute path to the file or directory */
  path: string;

  /** File content (for file type) */
  content?: string;

  /** Detected programming language */
  language?: string;

  /** When this context was added */
  addedAt: Date;

  /** Size of content in bytes */
  size: number;

  /** Additional metadata */
  metadata?: {
    /** Line range for selections */
    lineRange?: {
      start: number;
      end: number;
    };
    /** File permissions */
    permissions?: string;
    /** Last modified timestamp */
    lastModified?: Date;
    /** Whether content is truncated */
    isTruncated?: boolean;
  };
}
