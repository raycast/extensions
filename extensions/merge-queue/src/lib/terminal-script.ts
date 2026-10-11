export function terminalScript(command: string): string {
  return [
    "#!/bin/zsh -l",
    "clear",
    `echo ${JSON.stringify(`Running: ${command}`)}`,
    "echo",
    command,
    "echo",
    'echo "Done. Merge Queue picks this up on its next refresh; you can close this window."',
    "",
  ].join("\n");
}
