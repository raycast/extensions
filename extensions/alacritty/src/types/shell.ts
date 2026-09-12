export enum Shell {
  Bash = "bash",
  Zsh = "zsh",
  Fish = "fish",
  Sh = "sh",
}

export const isShell = (shell: string): shell is Shell => {
  return Object.values(Shell).includes(shell as Shell);
};
