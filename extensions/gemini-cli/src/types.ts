export interface Project {
  id: string;
  path: string;
  name: string;
}

export interface Session {
  id: string;
  projectId: string;
  projectName: string;
  projectPath: string;
  startTime: string;
  lastUpdated: string;
  messageCount: number;
  title: string;
  filePath: string;
}

export interface ProjectsConfig {
  projects: Record<string, string>;
}

export interface SessionMessage {
  id: string;
  timestamp: string;
  type: string;
  content: string | { text: string }[];
}

export interface SessionFile {
  sessionId: string;
  projectHash: string;
  startTime: string;
  lastUpdated: string;
  messages: SessionMessage[];
}
