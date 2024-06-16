export interface ShellHistory {
  command: string;
  timestamp: number | undefined;
  shell: Shell;
}

export enum Shell {
  ZSH = "Zsh",
  BASH = "Bash",
}

export const shellTags = [
  { title: "All", value: "All", icon: "shell-history-icon.png" },
  { title: Shell.ZSH, value: Shell.ZSH, icon: "zsh.png" },
  { title: Shell.BASH, value: Shell.BASH, icon: "bash.png" },
];
