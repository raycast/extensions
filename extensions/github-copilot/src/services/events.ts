import { getAccessToken } from "@raycast/utils";

// --- Raw /logs API Types ---

/** A tool call within a CompletionChunk delta */
export type ToolCallDelta = {
  id: string;
  index: number;
  type: string;
  function?: {
    name: string;
    arguments?: string;
    result?: string;
  };
};

/** The delta content of a streaming choice */
export type Delta = {
  content?: string | null;
  role?: string;
  reasoning_text?: string;
  reasoning_opaque?: string;
  tool_calls?: ToolCallDelta[];
};

/** A single choice in a CompletionChunk */
export type Choice = {
  finish_reason: string;
  index: number;
  delta: Delta;
};

/** A CompletionChunk from the /logs SSE stream */
export type CompletionChunk = {
  id: string;
  created: number | string;
  model: string;
  object: string;
  agentId?: string;
  choices: Choice[];
};

/** A tool result message from the /logs SSE stream */
export type CompletionToolMessage = {
  role: "tool";
  tool_call_id: string;
  content: string;
  agentId?: string;
};

/** A user message from the /logs SSE stream */
export type CompletionUserMessage = {
  role: "user";
  content: string;
  agentId?: string;
};

/** Union of all raw log entry types */
export type RawLogEntry = CompletionChunk | CompletionToolMessage | CompletionUserMessage;

/** Type guard for CompletionChunk */
export function isCompletionChunk(entry: RawLogEntry): entry is CompletionChunk {
  return "choices" in entry && Array.isArray((entry as CompletionChunk).choices);
}

/** Type guard for CompletionToolMessage */
export function isToolMessage(entry: RawLogEntry): entry is CompletionToolMessage {
  return "role" in entry && (entry as CompletionToolMessage).role === "tool";
}

/** Type guard for CompletionUserMessage */
export function isUserMessage(entry: RawLogEntry): entry is CompletionUserMessage {
  return "role" in entry && (entry as CompletionUserMessage).role === "user";
}

// --- Session Types ---

/** A session returned from the sessions API */
export type TaskSession = {
  id: string;
  name: string;
  state: string;
  task_id: string;
  created_at: string;
  completed_at: string | null;
  model: string;
  premium_requests: number;
  event_content: string;
  error: { message: string } | null;
};

/** Response from GET /agents/sessions?task_id={id} */
type ListSessionsResponse = {
  sessions: TaskSession[];
};

// --- Processed Types ---

/** A processed log entry ready for grouping and display */
export type LogEntry = {
  id: string;
  timestamp: string;
  type: "tool_call" | "user_message" | "assistant_message" | "info" | "error";
  toolName?: string;
  toolCallId?: string;
  arguments?: Record<string, unknown>;
  content?: string;
  result?: string;
  agentId?: string;
};

/** A group of subagent log entries */
export type SubAgentGroup = {
  kind: "subagent";
  id: string;
  agentName: string;
  entries: LogEntry[];
  isPending: boolean;
};

/** A group of consecutive same-tool calls */
export type ToolGroup = {
  kind: "tool_group";
  id: string;
  toolName: string;
  title: string;
  entries: LogEntry[];
};

/** A single standalone entry (not grouped) */
export type StandaloneEntry = {
  kind: "standalone";
  entry: LogEntry;
};

/** Top-level display item after all grouping */
export type GroupedLogEntry = SubAgentGroup | ToolGroup | StandaloneEntry;

/** Logs for a single session, fully processed */
export type SessionLogs = {
  session: TaskSession;
  groupedEntries: GroupedLogEntry[];
};

// --- API Functions ---

const COPILOT_API_BASE = "https://api.githubcopilot.com";

function getHeaders(): Record<string, string> {
  const { token } = getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    "Copilot-Integration-Id": "copilot-raycast",
  };
}

/** Fetch all sessions for a given task */
export async function fetchSessionsForTask(taskId: string): Promise<TaskSession[]> {
  const response = await fetch(`${COPILOT_API_BASE}/agents/sessions?task_id=${encodeURIComponent(taskId)}`, {
    headers: getHeaders(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch sessions (${response.status}): ${text}`);
  }

  const data = (await response.json()) as ListSessionsResponse;
  // The API may not filter by task_id server-side, so filter client-side
  return data.sessions.filter((s) => s.task_id === taskId);
}

/**
 * Fetch logs for a session from the /logs SSE endpoint.
 * Parses the SSE stream and returns an array of raw log entries.
 */
export async function fetchSessionLogs(sessionId: string): Promise<RawLogEntry[]> {
  const url = `${COPILOT_API_BASE}/agents/sessions/${encodeURIComponent(sessionId)}/logs`;

  const response = await fetch(url, { headers: getHeaders() });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch logs (${response.status}): ${text}`);
  }

  const text = await response.text();
  return parseSSEResponse(text);
}

/** Parse an SSE response body into an array of JSON objects */
function parseSSEResponse(text: string): RawLogEntry[] {
  const entries: RawLogEntry[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data: ")) continue;

    const jsonStr = trimmed.slice(6); // Remove "data: " prefix
    if (jsonStr === "[DONE]") continue;

    try {
      const parsed = JSON.parse(jsonStr) as RawLogEntry;
      entries.push(parsed);
    } catch {
      // Skip malformed lines
    }
  }

  return entries;
}
