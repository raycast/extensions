import { execFile, ChildProcess, spawn } from "child_process";
import { getPrefs } from "./preferences";

export interface WslDistro {
  name: string;
  isDefault: boolean;
  running: boolean;
  version: number;
}

export interface ExecWslResult {
  stdout: string;
  stderr: string;
}

export interface StreamCallbacks {
  onStdout: (data: string) => void;
  onStderr: (data: string) => void;
  onExit: (code: number | null) => void;
}

function buildWslArgs(command: string, distro?: string): string[] {
  const prefs = getPrefs();
  const dir = prefs.workingDirectory || "~";
  // Quote the directory so paths containing spaces (e.g. /home/user/my project)
  // are passed to bash as a single token. Use single quotes to prevent variable
  // expansion inside the path, then escape any literal single quotes.
  const escapedDir = dir.replace(/'/g, "'\\''");
  const fullCommand = dir !== "~" ? `cd '${escapedDir}' && ${command}` : command;

  const args: string[] = [];
  if (distro) {
    args.push("-d", distro);
  }
  args.push("--", "bash", "-ic", fullCommand);
  return args;
}

export function execWsl(command: string, distro?: string, timeout = 30000): Promise<ExecWslResult> {
  const args = buildWslArgs(command, distro);

  return new Promise((resolve, reject) => {
    execFile("wsl.exe", args, { timeout }, (error, stdout, stderr) => {
      if (error && !stdout && !stderr) {
        reject(error);
        return;
      }
      resolve({
        stdout: (stdout || "").toString().trim(),
        stderr: (stderr || "").toString().trim(),
      });
    });
  });
}

export function execWslStreaming(
  command: string,
  distro: string | undefined,
  callbacks: StreamCallbacks,
): ChildProcess {
  const args = buildWslArgs(command, distro);

  const child = spawn("wsl.exe", args, { stdio: ["ignore", "pipe", "pipe"] });

  child.stdout?.on("data", (chunk: Buffer) => {
    callbacks.onStdout(chunk.toString());
  });

  child.stderr?.on("data", (chunk: Buffer) => {
    callbacks.onStderr(chunk.toString());
  });

  child.on("exit", (code) => {
    callbacks.onExit(code);
  });

  child.on("error", (err) => {
    callbacks.onStderr(err.message);
    callbacks.onExit(1);
  });

  return child;
}

export async function listDistros(): Promise<WslDistro[]> {
  return new Promise((resolve, reject) => {
    execFile("wsl.exe", ["-l", "-v"], { encoding: "buffer" }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }

      const text = (stdout as unknown as Buffer).toString("utf16le").replace(/^\uFEFF/, "");
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

      // The header line tells us where each column starts, which is safer than
      // splitting on whitespace runs (splits would misparse names like "Ubuntu 22.04").
      // Header format (after stripping the leading * column):
      //   "  NAME           STATE           VERSION"
      const headerLine = lines[0];
      const nameStart = headerLine.indexOf("NAME");
      const stateStart = headerLine.indexOf("STATE");
      const versionStart = headerLine.indexOf("VERSION");

      const distros: WslDistro[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const isDefault = line.trimStart().startsWith("*");
        // Replace the leading asterisk with a space so column offsets stay valid
        const normalized = line.replace("*", " ");

        if (nameStart < 0 || stateStart < 0 || versionStart < 0) {
          // Fallback: header parsing failed, skip this line gracefully
          continue;
        }

        const name = normalized.substring(nameStart, stateStart).trim();
        const state = normalized.substring(stateStart, versionStart).trim();
        const versionStr = normalized.substring(versionStart).trim();

        if (!name) continue;

        distros.push({
          name,
          isDefault,
          running: state.toLowerCase() === "running",
          version: parseInt(versionStr, 10) || 2,
        });
      }

      resolve(distros);
    });
  });
}

function getHistoryPath(shellType: string): string {
  switch (shellType) {
    case "zsh":
      return "~/.zsh_history";
    case "fish":
      return "~/.local/share/fish/fish_history";
    case "bash":
    default:
      return "~/.bash_history";
  }
}

function parseHistoryLines(lines: string[], shellType: string): string[] {
  const parsed: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (shellType === "zsh") {
      // Zsh extended history: `: 1234567890:0;actual command`
      const match = trimmed.match(/^:\s*\d+:\d+;(.+)$/);
      if (match) {
        parsed.push(match[1]);
      } else {
        parsed.push(trimmed);
      }
    } else if (shellType === "fish") {
      // Fish history: `- cmd: actual command`
      const match = trimmed.match(/^- cmd:\s*(.+)$/);
      if (match) {
        parsed.push(match[1]);
      }
    } else {
      parsed.push(trimmed);
    }
  }

  return parsed;
}

export async function readWslHistory(distro?: string, shellType?: string): Promise<string[]> {
  const shell = shellType || "bash";
  const historyPath = getHistoryPath(shell);

  try {
    const { stdout } = await execWsl(`cat ${historyPath} 2>/dev/null || true`, distro, 10000);
    if (!stdout) return [];

    const lines = stdout.split("\n");
    const parsed = parseHistoryLines(lines, shell);

    // Deduplicate, reverse for most-recent-first, limit
    const unique = Array.from(new Set(parsed.reverse()));
    return unique.slice(0, 200);
  } catch {
    return [];
  }
}

export async function isWslInstalled(): Promise<boolean> {
  return new Promise((resolve) => {
    execFile("wsl.exe", ["--status"], (error) => {
      resolve(!error);
    });
  });
}

export async function setDefaultDistro(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile("wsl.exe", ["--set-default", name], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
