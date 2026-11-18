export type TerminalKind = "powershell" | "powershell7" | "cmd" | "wt";

export interface ShellApp {
  id: string;
  name: string;
  command: string;
  terminal: TerminalKind;
  workingDirectory?: string;
  keepOpen: boolean;
  runAsAdmin: boolean;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}

export const TERMINAL_LABELS: Record<TerminalKind, string> = {
  powershell: "PowerShell",
  powershell7: "PowerShell 7",
  cmd: "Command Prompt",
  wt: "Windows Terminal",
};
