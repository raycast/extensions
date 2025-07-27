export const getHostShell = () => {
  const shell = process.env.SHELL;
  if (shell) {
    return shell;
  }
  return "/bin/zsh";
};
