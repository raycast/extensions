export interface Project {
  id: string;
  worktree: string;
  vcs: string | null;
  name: string | null;
  sandboxes: unknown[];
  time: {
    created: number;
    updated: number;
  };
}

export interface Session {
  id: string;
  slug: string;
  version: string;
  projectID: string;
  directory: string;
  parentID?: string;
  title: string;
  time: {
    created: number;
    updated: number;
    compacting?: number;
    archived?: number;
  };
  summary?: {
    additions: number;
    deletions: number;
    files: number;
  };
  share?: {
    url: string;
  };
}

export interface Message {
  id: string;
  sessionID: string;
  role: "user" | "assistant";
  time: {
    created: number;
    completed?: number;
  };
  parentID?: string;
  modelID?: string;
  providerID?: string;
  agent?: string;
  mode?: string;
  cost?: number;
  tokens?: {
    input: number;
    output: number;
    reasoning: number;
    cache: {
      read: number;
      write: number;
    };
  };
  finish?: string;
}

export interface ToolState {
  status?: string;
  input?: Record<string, unknown>;
  output?: string;
}

export interface Part {
  id: string;
  sessionID: string;
  messageID: string;
  type: string;
  text?: string;
  tool?: string;
  state?: ToolState;
}

export interface TranscriptEntry {
  message: Message;
  parts: Part[];
}

export interface SessionWithProject {
  session: Session;
  project: Project | undefined;
}
