// ─── LLM / Chat Types ────────────────────────────────────────

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatResponse {
  content: string | null;
  toolCalls: ToolCall[] | null;
}

// ─── File Types ──────────────────────────────────────────────

/**
 * A file result from local search.
 */
export interface FileResult {
  /** Full file path */
  path: string;
  /** File name */
  name: string;
  /** File extension */
  extension: string;
  /** File size in bytes */
  size: number;
  /** Last modified date */
  modifiedAt: Date;
  /** Created date */
  createdAt: Date;
  /** Human-readable size */
  sizeFormatted: string;
}

/**
 * A ranked file result with AI explanation.
 */
export interface RankedFileResult extends FileResult {
  /** Why this file might match (from LLM) */
  matchReason: string;
  /** Relevance score 0-100 */
  relevanceScore: number;
}

// ─── Agent Types ─────────────────────────────────────────────

/**
 * A single step in the agent's reasoning process.
 */
export interface AgentStep {
  type: "thinking" | "tool_call" | "tool_result" | "answer" | "error";
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

// ─── Agent Event Stream Types ────────────────────────────────

/**
 * Fine-grained events for streaming UI updates (pi-mono style).
 * UI can render a single assistant "thinking" message that is updated in place,
 * instead of appending many small "thinking" steps.
 */
export type AgentEvent =
  | { type: "agent_start" }
  | { type: "agent_end" }
  | { type: "turn_start"; iteration: number }
  | { type: "turn_end"; iteration: number }
  | {
      type: "assistant_message_start";
      messageId: string;
      kind: "thinking" | "answer";
    }
  | {
      type: "assistant_message_update";
      messageId: string;
      delta: string;
      content: string;
    }
  | {
      type: "assistant_message_end";
      messageId: string;
      content: string;
    }
  | {
      type: "tool_execution_start";
      toolCallId: string;
      toolName: string;
      args: Record<string, unknown>;
    }
  | {
      type: "tool_execution_end";
      toolCallId: string;
      toolName: string;
      isError: boolean;
      result: string;
      skipped?: boolean;
    };

/**
 * The final result returned by the agent.
 */
export interface AgentResult {
  /** Ranked files found by the agent */
  files: RankedFileResult[];
  /** Agent's summary of what it found */
  summary: string;
  /** Optional clarifying questions */
  clarifyingQuestions: string[];
}

/**
 * The agent's state during a search session, used by the UI.
 */
export interface AgentState {
  /** Current phase */
  phase: "idle" | "thinking" | "results" | "not_found";
  /** The original user query */
  query: string;
  /** Agent reasoning steps (for collapsible thinking view) */
  steps: AgentStep[];
  /** Agent result summary */
  summary: string;
  /** Search results */
  results: RankedFileResult[];
  /** Clarifying questions from agent */
  clarifyingQuestions: string[];
  /** Error message if any */
  error: string | null;
}
