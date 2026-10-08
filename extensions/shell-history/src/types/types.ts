import { Application } from "@raycast/api";

export enum CliType {
  CliTool = "CliTool",
  Operation = "Operation",
  Comment = "Comment",
  Unknown = "Unknown",
}

export interface Cli {
  type: CliType;
  command: string;
}

export interface ShellHistory {
  command: string;
  timestamp: number | undefined;
  shell: Shell;
  cli: Cli[];
}

export enum Shell {
  ZSH = "Zsh",
  BASH = "Bash",
  FISH = "Fish",
}

export const allShellTags = [
  { title: Shell.ZSH, value: Shell.ZSH, icon: "zsh.png" },
  { title: Shell.BASH, value: Shell.BASH, icon: "bash.png" },
  { title: Shell.FISH, value: Shell.FISH, icon: "fish.png" },
];

export interface Terminal {
  application: Application;
  supportInput: boolean;
  key: string;
}
