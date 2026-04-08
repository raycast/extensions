import { spawn, ChildProcess } from "child_process";
import { tmpdir, homedir } from "os";
import { join, extname, basename } from "path";
import { mkdtempSync, writeFileSync, readdirSync, renameSync, mkdirSync, statSync } from "fs";

export interface TransferProgress {
  percent: number;
  transferred: string;
  total: string;
  speed: string;
  eta?: string;
  elapsed?: string;
}

/** Build a Unicode block progress bar: ▓▓▓▓▓▓▓░░░░░ 72% */
export function buildProgressBar(percent: number, width = 20): string {
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return "\u2593".repeat(filled) + "\u2591".repeat(empty);
}

/** Parse a size string like "5.2 MB" into bytes for ETA calculation */
function parseSizeToBytes(s: string): number {
  const match = s.match(/([\d.]+)\s*(B|KB|MB|GB|TB|kB)/i);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };
  return val * (multipliers[unit] || 1);
}

/** Calculate ETA from speed string and remaining bytes */
function calculateEta(transferred: string, total: string, speedStr: string): string | undefined {
  const transferredBytes = parseSizeToBytes(transferred);
  const totalBytes = parseSizeToBytes(total);
  const speedBytes = parseSizeToBytes(speedStr.replace("/s", ""));
  if (speedBytes <= 0 || totalBytes <= 0) return undefined;
  const remaining = totalBytes - transferredBytes;
  if (remaining <= 0) return "< 1s";
  const seconds = Math.ceil(remaining / speedBytes);
  if (seconds < 60) return `~${seconds}s`;
  if (seconds < 3600) return `~${Math.ceil(seconds / 60)}m`;
  return `~${Math.floor(seconds / 3600)}h ${Math.ceil((seconds % 3600) / 60)}m`;
}

/** Format elapsed time from start */
function formatElapsed(startMs: number): string {
  const seconds = Math.floor((Date.now() - startMs) / 1000);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

export interface TransferResult {
  success: boolean;
  phrase?: string;
  error?: string;
  files?: string[];
}

export type ProgressCallback = (progress: TransferProgress) => void;
export type PhraseCallback = (phrase: string) => void;
export type CompleteCallback = (result: TransferResult) => void;
export type ErrorCallback = (error: Error) => void;

const CODE_PHRASE_REGEX = /Code is:\s*(.+)/i;
const PROGRESS_REGEX = /(\d+)%/;
const SIZE_REGEX = /([\d.]+\s*\w+)\s*\/\s*([\d.]+\s*\w+)/;
const SPEED_REGEX = /([\d.]+\s*\w+\/s)/;
const TRANSFER_COMPLETE_SEND_REGEX = /File sent\.|Transfer complete\.|sent\s+\d+/i;

export interface CrocProcess {
  kill: () => void;
}

// Python PTY wrapper: allocates a real PTY so croc can write to /dev/tty
// croc uses /dev/tty for all output; this script makes it think it's in a terminal
const PTY_WRAPPER_PY = `
import os, sys, pty, select

def run(args):
    master, slave = pty.openpty()
    pid = os.fork()
    if pid == 0:
        os.close(master)
        os.dup2(slave, 0); os.dup2(slave, 1); os.dup2(slave, 2)
        if slave > 2: os.close(slave)
        os.setsid()
        import fcntl, termios
        fcntl.ioctl(0, termios.TIOCSCTTY, 1)
        os.execv(args[0], args)
        sys.exit(1)
    os.close(slave)
    while True:
        try:
            r, _, _ = select.select([master], [], [], 0.05)
            if r:
                chunk = os.read(master, 4096)
                if not chunk: break
                sys.stdout.buffer.write(chunk)
                sys.stdout.flush()
        except OSError: break
    _, status = os.waitpid(pid, 0)
    sys.exit(os.WEXITSTATUS(status))

run(sys.argv[1:])
`.trim();

/** Strip ANSI escape codes and normalize carriage returns */
function cleanOutput(raw: string): string {
  return raw
    .replace(/\x1b\[[0-9;]*[mGKHFJACBD]/g, "")
    .replace(/\r/g, "\n");
}

/**
 * Spawn croc through a Python PTY wrapper.
 * croc writes its entire UI (including code phrase) to /dev/tty, which is
 * invisible to a plain pipe. The PTY wrapper allocates a real pseudo-terminal
 * so croc thinks it's talking to a terminal, then forwards all PTY output to stdout.
 *
 * @param runDir  Working directory for croc (files are saved here on receive)
 */
function spawnWithPty(
  crocPath: string,
  args: string[],
  onData: (text: string) => void,
  onExit: (code: number | null, log: string) => void,
  runDir?: string,
  extraEnv?: Record<string, string>
): () => void {
  const scriptDir = mkdtempSync(join(tmpdir(), "croc-"));
  const wrapperPath = join(scriptDir, "pty_wrapper.py");
  writeFileSync(wrapperPath, PTY_WRAPPER_PY, { mode: 0o755 });

  const cwd = runDir ?? scriptDir;

  let proc: ChildProcess | null = null;
  let outputLog = "";
  let dead = false;

  const cleanup = () => {
    if (dead) return;
    dead = true;
    try { proc?.kill("SIGTERM"); } catch { /* ignore */ }
  };

  try {
    proc = spawn("/usr/bin/python3", [wrapperPath, crocPath, ...args], {
      cwd,
      env: { ...process.env, TERM: "xterm-256color", ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const handleData = (data: Buffer) => {
      const raw = data.toString();
      outputLog += raw;
      onData(cleanOutput(raw));
    };

    proc.stdout?.on("data", handleData);
    proc.stderr?.on("data", handleData);

    proc.on("close", (code) => {
      setTimeout(() => {
        cleanup();
        onExit(code, cleanOutput(outputLog));
      }, 200);
    });

    proc.on("error", (err) => {
      cleanup();
      onExit(1, err.message);
    });
  } catch (err) {
    cleanup();
    onExit(1, String(err));
  }

  return cleanup;
}

export function spawnCrocSend(
  crocPath: string,
  args: string[],
  onPhrase: PhraseCallback,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback
): CrocProcess {
  let phrase = "";
  let completed = false;
  const startMs = Date.now();

  const kill = spawnWithPty(
    crocPath,
    args,
    (text) => {
      const phraseMatch = text.match(CODE_PHRASE_REGEX);
      if (phraseMatch && !phrase) {
        phrase = phraseMatch[1].trim();
        onPhrase(phrase);
      }

      const percentMatch = text.match(PROGRESS_REGEX);
      if (percentMatch) {
        const sizeMatch = text.match(SIZE_REGEX);
        const speedMatch = text.match(SPEED_REGEX);
        const transferred = sizeMatch ? sizeMatch[1] : "";
        const total = sizeMatch ? sizeMatch[2] : "";
        const speed = speedMatch ? speedMatch[1] : "";
        onProgress({
          percent: parseInt(percentMatch[1], 10),
          transferred,
          total,
          speed,
          eta: calculateEta(transferred, total, speed),
          elapsed: formatElapsed(startMs),
        });
      }

      if (TRANSFER_COMPLETE_SEND_REGEX.test(text) && !completed) {
        completed = true;
        onComplete({ success: true, phrase });
      }
    },
    (code, log) => {
      if (!completed) {
        if (code === 0 || phrase) {
          completed = true;
          onComplete({ success: true, phrase });
        } else {
          const detail = log.trim() ? `\n\n${log.trim().slice(-400)}` : "";
          onError(new Error(`croc exited with code ${code}${detail}`));
        }
      }
    }
  );

  return { kill };
}

/** Format a Date as receive-yyyyMMdd-hhmm */
function crocTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `receive-${yyyy}${MM}${dd}-${hh}${mm}`;
}

/** Rename newly received files to croc-YYYY-MM-DD-HH-mm-ss[.ext].
 *  Uses snapshot diff as primary method, falls back to mtime-based detection
 *  to handle hidden files (.DS_Store) and any write-timing edge cases.
 */
function renameReceivedFiles(downloadDir: string, before: Set<string>, startedAt: Date): string[] {
  let allFiles: string[];
  try {
    // Skip macOS hidden files (e.g. .DS_Store) that would pollute the diff
    allFiles = readdirSync(downloadDir).filter((f) => !f.startsWith("."));
  } catch {
    return [];
  }

  // Primary: snapshot diff
  let newFiles = allFiles.filter((f) => !before.has(f));

  // Fallback: time-based detection (covers cases where snapshot is unreliable)
  if (newFiles.length === 0) {
    const cutoffMs = startedAt.getTime() - 2000; // 2s grace period
    newFiles = allFiles.filter((f) => {
      try {
        return statSync(join(downloadDir, f)).mtimeMs >= cutoffMs;
      } catch {
        return false;
      }
    });
  }

  if (newFiles.length === 0) return [];

  const renamed: string[] = [];
  const ts = crocTimestamp(startedAt);
  const existingNames = new Set(allFiles);

  newFiles.forEach((file, idx) => {
    const originalExt = extname(file);
    // Convert plain text files to markdown
    const ext = originalExt.toLowerCase() === ".txt" ? ".md" : originalExt;
    const suffix = newFiles.length > 1 ? `-${idx + 1}` : "";
    let newName = `${ts}${suffix}${ext}`;
    let dst = join(downloadDir, newName);

    // Avoid collision
    let counter = 2;
    while (existingNames.has(newName) && counter < 100) {
      newName = `${ts}${suffix}-${counter}${ext}`;
      dst = join(downloadDir, newName);
      counter++;
    }

    try {
      renameSync(join(downloadDir, file), dst);
      existingNames.add(newName);
      renamed.push(dst);
    } catch {
      // Rename failed — still report original path so caller knows file exists
      renamed.push(join(downloadDir, file));
    }
  });

  return renamed;
}

export function spawnCrocReceive(
  crocPath: string,
  args: string[],
  codePhrase: string,
  downloadDir: string,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback
): CrocProcess {
  let completed = false;
  const startedAt = new Date();
  const startMs = startedAt.getTime();

  // Ensure download dir exists
  mkdirSync(downloadDir, { recursive: true });

  // Snapshot directory contents before transfer
  const beforeFiles = new Set(readdirSync(downloadDir));

  const kill = spawnWithPty(
    crocPath,
    args,
    (text) => {
      const percentMatch = text.match(PROGRESS_REGEX);
      if (percentMatch) {
        const sizeMatch = text.match(SIZE_REGEX);
        const speedMatch = text.match(SPEED_REGEX);
        const transferred = sizeMatch ? sizeMatch[1] : "";
        const total = sizeMatch ? sizeMatch[2] : "";
        const speed = speedMatch ? speedMatch[1] : "";
        onProgress({
          percent: parseInt(percentMatch[1], 10),
          transferred,
          total,
          speed,
          eta: calculateEta(transferred, total, speed),
          elapsed: formatElapsed(startMs),
        });
      }

      // Don't rename here — file may still be writing. Just update progress.
    },
    (code, log) => {
      if (!completed) {
        completed = true;
        if (code === 0) {
          // croc has fully exited → file is completely written, safe to rename
          const renamed = renameReceivedFiles(downloadDir, beforeFiles, startedAt);
          onComplete({ success: true, files: renamed });
        } else {
          const detail = log.trim() ? `\n\n${log.trim().slice(-400)}` : "";
          onError(new Error(`croc exited with code ${code}${detail}`));
        }
      }
    },
    downloadDir,                        // cwd = downloadDir → files saved here
    { CROC_SECRET: codePhrase }         // croc v10: code phrase via env var
  );

  return { kill };
}
