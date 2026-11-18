export type ChatProvider = "claude" | "codex";

export type SessionFilter = "all" | "live" | ChatProvider;

export interface DataRoots {
  claude: string;
  codex: string;
}

export interface ChatSession {
  id: string;
  provider: ChatProvider;
  title: string;
  nativeTitle?: string;
  preview: string;
  projectName: string;
  cwd: string;
  sourcePath: string;
  createdAt: number;
  updatedAt: number;
  size: number;
  userMessageCount: number;
  isActive: boolean;
  model?: string;
  cliVersion?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: number;
  model?: string;
}

export interface Transcript {
  messages: ChatMessage[];
  truncated: boolean;
  parsedBytes: number;
  fileSize: number;
}
