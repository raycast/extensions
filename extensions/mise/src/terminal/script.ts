import type { MiseLocation } from "../mise/locate";
import type { MiseOperation } from "../mise/operations";

export type TerminalLaunch = { kind: "applescript"; source: string } | { kind: "open"; args: string[] };

export const GHOSTTY = "com.mitchellh.ghostty";
export const ITERM = "com.googlecode.iterm2";
export const TERMINAL = "com.apple.Terminal";

const BARE_WORD = /^[A-Za-z0-9_@%+=:,./-]+$/;

export function shellQuote(arg: string): string {
  return BARE_WORD.test(arg) ? arg : `'${arg.replace(/'/g, "'\\''")}'`;
}

export function miseCommandLine(location: Pick<MiseLocation, "path">, op: Pick<MiseOperation, "args">): string {
  return [location.path, ...op.args].map(shellQuote).join(" ");
}

// An interactive login shell: -l alone skips .zshrc, where PATH additions, mise activate and
// exports such as CARGO_HOME usually live. A second one keeps the window open afterwards.
function keepOpen(command: string, shell: string): string {
  return `${command}; exec ${shellQuote(shell)} -l`;
}

export function shellCommandFor(command: string, shell: string): string {
  return `${shellQuote(shell)} -il -c ${shellQuote(keepOpen(command, shell))}`;
}

export function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function terminalLaunches(bundleId: string | undefined, command: string, shell: string): TerminalLaunch[] {
  const wrapped = shellCommandFor(command, shell);
  switch (bundleId) {
    case GHOSTTY:
      return [
        {
          kind: "applescript",
          source: [
            'tell application "Ghostty"',
            `  new window with configuration {command:${appleScriptString(wrapped)}}`,
            "  activate",
            "end tell",
          ].join("\n"),
        },
        { kind: "open", args: ["-na", "Ghostty.app", "--args", "-e", shell, "-il", "-c", keepOpen(command, shell)] },
      ];
    case ITERM:
      return [
        {
          kind: "applescript",
          source: [
            'tell application "iTerm"',
            `  create window with default profile command ${appleScriptString(wrapped)}`,
            "  activate",
            "end tell",
          ].join("\n"),
        },
      ];
    default:
      return [
        {
          kind: "applescript",
          source: [
            'tell application "Terminal"',
            `  do script ${appleScriptString(command)}`,
            "  activate",
            "end tell",
          ].join("\n"),
        },
      ];
  }
}
