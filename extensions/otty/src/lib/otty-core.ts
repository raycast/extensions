export const DEFAULT_OTTY_CLI_PATH =
  "/Applications/Otty.app/Contents/MacOS/otty-cli";

export type CommandArgs = {
  args: string[];
  env?: NodeJS.ProcessEnv;
};

export function shellEscape(input: string): string {
  return `'${input.replace(/'/g, `'\\''`)}'`;
}

export function buildOpenDirectoryArgs(directory: string): CommandArgs {
  return {
    args: ["open", directory],
  };
}

export function buildOpenDirectoryTabArgs(directory: string): string[] {
  return ["tab", "new", "--cwd", directory];
}

export function buildRunCommandArgs(command: string): string[] {
  return ["open", "--command", command];
}

export function buildSshCommandArgs(target: string): string[] {
  return buildRunCommandArgs(`ssh ${shellEscape(normalizeSshTarget(target))}`);
}

export function buildFinderDirectoryScriptArgs(): string[] {
  return [
    "-e",
    'tell application "Finder"',
    "-e",
    "if (count of Finder windows) > 0 then",
    "-e",
    "POSIX path of (target of front Finder window as alias)",
    "-e",
    "else",
    "-e",
    "POSIX path of (desktop as alias)",
    "-e",
    "end if",
    "-e",
    "end tell",
  ];
}

/** Strip an optional `ssh://` prefix and trim whitespace. */
export function normalizeSshTarget(input: string): string {
  return input.trim().replace(/^ssh:\/\//, "");
}
