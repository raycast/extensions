export const DEFAULT_OTTY_CLI_PATH =
  "/Applications/Otty.app/Contents/MacOS/otty-cli";

export type CommandArgs = {
  args: string[];
  env?: NodeJS.ProcessEnv;
};

export type SshTarget =
  | { kind: "url"; value: string }
  | { kind: "target"; value: string };

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
  return buildRunCommandArgs(
    `ssh ${shellEscape(target.replace(/^ssh:\/\//, ""))}`,
  );
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

export function normalizeSshTarget(input: string): SshTarget {
  const value = input.trim();
  return value.startsWith("ssh://")
    ? { kind: "url", value }
    : { kind: "target", value };
}
