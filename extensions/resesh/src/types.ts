export interface SessionInfo {
  sessionId: string;
  projectDir: string;
  projectPath: string;
  projectLabel: string;
  customTitle: string | null;
  firstUserPrompt: string | null;
  lastModified: number;
  gitBranch: string | null;
  wslDistro?: string;
}

export interface MessageSnippet {
  text: string;
  source: "user" | "assistant";
  timestamp: string | null;
}

export interface SessionSearchResult {
  session: SessionInfo;
  matchCount: number;
  matches: MessageSnippet[];
  preview: MessageSnippet[];
}

export interface ProjectInfo {
  dir: string;
  label: string;
}
