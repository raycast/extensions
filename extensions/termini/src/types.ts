import type { TerminiTheme } from "./themes";

export interface TerminiConfig {
  shellPath: string;
  shellArgs: string[];
  workingDirectory: string;
  visibleTerminalLines: number;
  terminalColumns: number;
  maxTranscriptLines: number;
  pythonPath: string;
  terminalApp: string;
  supportPath: string;
  daemonPath: string;
  configPath: string;
  pidPath: string;
  logPath: string;
  socketPath: string;
}

export interface TerminalTab {
  id: string;
  title: string;
  index: number;
  commandCount: number;
  text: string;
  status?: "idle" | "running";
  cursorRow?: number;
  cursorCol?: number;
  rows?: number;
  columns?: number;
  cells?: TerminalCell[][];
  truncated?: boolean;
  attached?: boolean;
}

export interface TerminalCell {
  ch: string;
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
}

export interface DaemonState {
  ok?: boolean;
  version?: string;
  revision?: number;
  selectedId?: string;
  tabs: TerminalTab[];
  error?: string;
}

export type DaemonRequest =
  | { command: "ping" }
  | { command: "state" }
  | { command: "wait"; revision: number; timeoutMs: number }
  | { command: "resize"; rows: number; columns: number }
  | { command: "theme"; theme: TerminiTheme }
  | { command: "send"; tabId: string; data: string; filterEcho?: boolean; submittedTitle?: string }
  | { command: "new" }
  | { command: "close"; tabId: string }
  | { command: "restart"; tabId: string }
  | { command: "reset" };
