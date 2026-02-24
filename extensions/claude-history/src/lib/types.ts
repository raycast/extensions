export type ProjectInfo = {
  encodedPath: string;
  decodedPath: string;
  displayName: string;
  sessionCount: number;
  lastActivity?: Date;
};

export type SessionSummary = {
  sessionId: string;
  projectPath: string;
  projectDisplayName: string;
  filePath: string;
  firstPrompt: string;
  timestamp: Date;
  gitBranch?: string;
  messageCount: number;
};

export type Exchange = {
  role: "user" | "assistant";
  text: string;
  timestamp?: Date;
  toolNames?: string[];
  model?: string;
  tokenUsage?: {
    input: number;
    output: number;
  };
};

export type HistoryEntry = {
  display: string;
  timestamp: number;
  project: string;
  sessionId?: string;
};

/** Raw JSONL message types from Claude session files */
export type SessionMessage = {
  type:
    | "user"
    | "assistant"
    | "progress"
    | "file-history-snapshot"
    | "queue-operation"
    | string;
  message?: {
    role?: string;
    content?: string | ContentBlock[];
    model?: string;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };
  sessionId?: string;
  gitBranch?: string;
  timestamp?: string;
  cwd?: string;
  uuid?: string;
};

export type ContentBlock = {
  type: "text" | "tool_use" | "tool_result" | string;
  text?: string;
  name?: string;
  id?: string;
};
