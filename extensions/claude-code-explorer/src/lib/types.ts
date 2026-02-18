export interface HistoryEntry {
  display: string;
  timestamp: number;
  project: string;
  sessionId: string;
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result" | "thinking";
  text?: string;
  thinking?: string;
  name?: string;
  input?: unknown;
  content?: string | ContentBlock[];
}

export interface ConversationMessage {
  type: "user" | "assistant" | "progress" | "file-history-snapshot";
  uuid: string;
  timestamp: string;
  sessionId: string;
  message?: {
    role: string;
    model?: string;
    content: string | ContentBlock[];
  };
}

export interface Session {
  id: string;
  display: string;
  timestamp: number;
  lastActiveAt: number;
  project: string;
  projectName: string;
}

export type SortOrder = "recent" | "created";
