export interface TaskAction {
  id: string;
  type: "browser" | "terminal" | "application" | "file";
  timestamp: number;
  data: BrowserAction | TerminalAction | ApplicationAction | FileAction;
}

export interface BrowserAction {
  url: string;
  title?: string;
  action: "navigate" | "click" | "type" | "scroll";
  element?: string;
  value?: string;
  browser?: string;
  tabContext?: "same_tab" | "new_tab" | "new_window";
  tabId?: string;
}

export interface TerminalAction {
  command: string;
  directory: string;
  output?: string;
  exitCode?: number;
}

export interface ApplicationAction {
  app: string;
  action: "open" | "close" | "switch";
  window?: string;
}

export interface FileAction {
  path: string;
  action: "open" | "save" | "create" | "delete";
  content?: string;
}

export interface TaskRecording {
  id: string;
  name: string;
  description?: string;
  userName: string;
  createdAt: number;
  updatedAt: number;
  actions: TaskAction[];
  tags: string[];
  sensitiveData?: string;
}

export interface RecordingSession {
  id: string;
  startTime: number;
  isActive: boolean;
  actions: TaskAction[];
  userName: string;
}
