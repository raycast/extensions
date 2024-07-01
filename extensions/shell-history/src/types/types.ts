import { Application, Icon } from "@raycast/api";

export interface ShellHistory {
  command: string;
  timestamp: number | undefined;
  shell: Shell;
}

export enum Shell {
  ZSH = "Zsh",
  BASH = "Bash",
  FISH = "Fish",
}

export const shellTags = [
  { title: "All", value: "All", icon: Icon.Tag },
  { title: Shell.ZSH, value: Shell.ZSH, icon: "zsh.png" },
  { title: Shell.BASH, value: Shell.BASH, icon: "bash.png" },
  { title: Shell.FISH, value: Shell.FISH, icon: "fish.png" },
];

export interface Terminal {
  application: Application;
  supportInput: boolean;
}

export enum CliToolType {
  COMMAND = "Command",
  OP = "Operation",
  COMMENT = "Comment",
}

export interface CliTool {
  type: string;
  value: string;
  icon: Icon;
}
