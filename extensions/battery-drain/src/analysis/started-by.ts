import { ProcessInfo } from "../types";

const SHELLS = new Set(["zsh", "bash", "sh", "fish", "dash", "tcsh", "login"]);
const MAX_DEPTH = 4;

// Terminal apps and session hosts, by executable name. Reaching one means the user typed the command:
// the terminal names no culprit, and terminating it would close every session in it.
const TERMINALS: [RegExp, string][] = [
  [/^iTermServer-/, "iTerm"],
  [/^iTerm2$/, "iTerm"],
  [/^Terminal$/, "Terminal"],
  [/^(tmux|screen)/, "tmux"],
  [/^sshd/, "SSH session"],
  [/^(ghostty|kitty|alacritty|wezterm-gui|WezTerm|Warp|stable|Hyper|Tabby)$/i, "a terminal"],
];

function terminalName(command: string): string | undefined {
  return TERMINALS.find(([re]) => re.test(command))?.[1];
}

/** terminal: the command was typed in a terminal, which is named but must not be offered for termination. */
export type StartedBy = { pid: number; command: string; via?: string; terminal?: true };

/**
 * The app that started a process, skipping intermediate shells: caffeinate ← zsh ← claude is
 * reported as claude via zsh. Undefined when launchd started it, since that names no culprit.
 */
export function startedBy(pid: number, info: Map<number, ProcessInfo>): StartedBy | undefined {
  let shell: { pid: number; command: string } | undefined;
  let ppid = info.get(pid)?.ppid;
  for (let depth = 0; depth < MAX_DEPTH && ppid !== undefined && ppid > 1; depth++) {
    const parent = info.get(ppid);
    if (!parent) break;
    const terminal = terminalName(parent.command);
    if (terminal) return { pid: ppid, command: terminal, via: shell?.command, terminal: true };
    if (!SHELLS.has(parent.command)) return { pid: ppid, command: parent.command, via: shell?.command };
    shell ??= { pid: ppid, command: parent.command };
    ppid = parent.ppid;
  }
  return shell ? { pid: shell.pid, command: shell.command, via: undefined } : undefined;
}
