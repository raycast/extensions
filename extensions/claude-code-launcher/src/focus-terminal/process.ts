import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface ProcessInfo {
  pid: number;
  ppid: number;
  command: string;
}

export async function getTtyPath(pid: number): Promise<string | undefined> {
  const { stdout } = await execFileAsync("ps", ["-o", "tty=", "-p", String(pid)]);
  const tty = stdout.trim();
  return tty && tty !== "??" ? `/dev/${tty}` : undefined;
}

export async function getAncestors(pid: number): Promise<ProcessInfo[]> {
  const ancestors: ProcessInfo[] = [];
  let current = pid;
  for (let depth = 0; depth < 20 && current > 1; depth++) {
    let stdout: string;
    try {
      ({ stdout } = await execFileAsync("ps", ["-o", "ppid=,comm=", "-p", String(current)]));
    } catch {
      break; // process exited mid-walk
    }
    const match = stdout.trim().match(/^(\d+)\s+(.*)$/);
    if (!match) break;
    const ppid = Number(match[1]);
    ancestors.push({ pid: current, ppid, command: match[2] });
    current = ppid;
  }
  return ancestors;
}

// Whether a process looks like a GUI terminal app hosting a session: anything
// inside an .app bundle, plus bare binaries of known terminals (e.g. Homebrew
// installs). Broader than the focus adapters on purpose — terminals without
// window-level scripting still get app-level activation.
export function isTerminalProcess(process: ProcessInfo): boolean {
  return /\.app\//.test(process.command) || /alacritty|ghostty|kitty|wezterm/i.test(process.command);
}

export function appNameOf(command: string): string {
  const bundle = command.match(/\/([^/]+)\.app\//);
  if (bundle) return bundle[1];
  return command.split("/").pop() ?? command;
}

export function bundlePathOf(command: string): string | undefined {
  const match = command.match(/^(.*?\.app)\//);
  return match ? match[1] : undefined;
}
