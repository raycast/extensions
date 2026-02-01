import { exec } from "child_process";
import { existsSync } from "fs";
import { promisify } from "util";

const execAsync = promisify(exec);

// Homebrew paths for macOS
const PATH_PREFIX = "PATH=/opt/homebrew/bin:/usr/local/bin:$PATH";

export interface TmuxSession {
  name: string;
  windows: number;
  attached: boolean;
  created: string;
}

function escapeShellSingleQuotes(value: string): string {
  return value.replace(/'/g, "'\\''");
}

function buildTmuxBase(socketPath?: string): string {
  const trimmed = socketPath?.trim();
  if (!trimmed) return `${PATH_PREFIX} tmux`;
  const escapedSocket = escapeShellSingleQuotes(trimmed);
  return `${PATH_PREFIX} tmux -S '${escapedSocket}'`;
}

function getGhosttyBinary(): string {
  const override = process.env.GHOSTTY_BIN?.trim();
  if (override) return override;

  const home = process.env.HOME || "";
  const candidates = [
    "/Applications/Ghostty.app/Contents/MacOS/ghostty",
    home ? `${home}/Applications/Ghostty.app/Contents/MacOS/ghostty` : "",
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return "ghostty";
}

export function buildListCommand(
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): string {
  const tmuxBase = buildTmuxBase(socketPath);
  const listCmd = `${tmuxBase} list-sessions -F '#S|#{session_windows}|#{session_attached}|#{session_created_string}' 2>/dev/null || true`;
  return mode === "ssh" ? `ssh ${sshHost} "${listCmd}"` : listCmd;
}

export function parseSessionOutput(stdout: string): TmuxSession[] {
  if (!stdout.trim()) return [];

  return stdout
    .trim()
    .split("\n")
    .filter((line) => line.includes("|"))
    .map((line) => {
      const parts = line.split("|");
      const name = parts[0] || "";
      const windows = parseInt(parts[1], 10) || 1;
      const attached = parts[2] === "1";
      const created = parts[3] || "";
      return { name, windows, attached, created };
    })
    .filter((session) => session.name.length > 0);
}

export async function listSessions(
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): Promise<TmuxSession[]> {
  const cmd = buildListCommand(mode, sshHost, socketPath);
  try {
    const { stdout } = await execAsync(cmd);
    return parseSessionOutput(stdout);
  } catch {
    return [];
  }
}

export function buildAttachCommand(
  session: string,
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): string {
  // Escape session name for shell safety
  const escapedSession = escapeShellSingleQuotes(session);
  const tmuxBase = buildTmuxBase(socketPath);
  const tmuxCmd = `${tmuxBase} new -A -s '${escapedSession}'`;
  return mode === "ssh" ? `ssh ${sshHost} -t "${tmuxCmd}"` : tmuxCmd;
}

export function buildRenameCommand(
  session: string,
  newName: string,
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): string {
  const escapedSession = escapeShellSingleQuotes(session);
  const escapedNewName = escapeShellSingleQuotes(newName);
  const tmuxBase = buildTmuxBase(socketPath);
  const tmuxCmd = `${tmuxBase} rename-session -t '${escapedSession}' '${escapedNewName}'`;
  return mode === "ssh" ? `ssh ${sshHost} "${tmuxCmd}"` : tmuxCmd;
}

export function buildKillCommand(
  session: string,
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): string {
  const escapedSession = escapeShellSingleQuotes(session);
  const tmuxBase = buildTmuxBase(socketPath);
  const tmuxCmd = `${tmuxBase} kill-session -t '${escapedSession}'`;
  return mode === "ssh" ? `ssh ${sshHost} "${tmuxCmd}"` : tmuxCmd;
}

export function buildTerminalLaunchCommand(
  shellCommand: string,
  terminal: "ghostty" | "iterm",
): string {
  if (terminal === "ghostty") {
    // Ghostty: use CLI -e to run a command in a new window/tab
    // Escape single quotes in the command by replacing ' with '\''
    const escaped = shellCommand.replace(/'/g, "'\\''");
    const ghosttyBin = getGhosttyBinary();
    return `${ghosttyBin} -e /bin/bash -lc '${escaped}'`;
  } else {
    // iTerm2: use AppleScript
    const escaped = shellCommand.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `osascript -e 'tell application "iTerm" to create window with default profile command "${escaped}"'`;
  }
}

export function openInTerminal(
  shellCommand: string,
  terminal: "ghostty" | "iterm",
): Promise<void> {
  return new Promise((resolve, reject) => {
    const launchCmd = buildTerminalLaunchCommand(shellCommand, terminal);
    exec(launchCmd, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

export async function renameSession(
  session: string,
  newName: string,
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): Promise<void> {
  const cmd = buildRenameCommand(session, newName, mode, sshHost, socketPath);
  await execAsync(cmd);
}

export async function killSession(
  session: string,
  mode: "local" | "ssh",
  sshHost: string,
  socketPath?: string,
): Promise<void> {
  const cmd = buildKillCommand(session, mode, sshHost, socketPath);
  await execAsync(cmd);
}
