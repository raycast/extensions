import { spawn, ChildProcess, execSync } from "child_process";
import { tmpdir } from "os";
import { join } from "path";
import {
  mkdtempSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  statSync,
  rmSync,
  existsSync,
} from "fs";

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
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
  };
  return val * (multipliers[unit] || 1);
}

function calculateEta(
  transferred: string,
  total: string,
  speedStr: string,
): string | undefined {
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
const TRANSFER_COMPLETE_SEND_REGEX =
  /File sent\.|Transfer complete\.|sent\s+\d+/i;

export interface CrocProcess {
  kill: () => void;
}

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

function cleanOutput(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/\x1b\[[0-9;]*[mGKHFJACBD]/g, "").replace(/\r/g, "\n");
}

function findPython3Path(): string {
  const candidatePaths = [
    "/usr/bin/python3",
    "/usr/local/bin/python3",
    "/opt/homebrew/bin/python3",
    "/opt/local/bin/python3",
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  try {
    const result = execSync("which python3", {
      encoding: "utf8",
      timeout: 3000,
    }).trim();
    if (result && existsSync(result)) {
      return result;
    }
  } catch {
    // which failed
  }

  throw new Error(
    "Python 3 not found. Please install Python 3 or Xcode Command Line Tools.",
  );
}

function spawnWithPty(
  crocPath: string,
  args: string[],
  onData: (text: string) => void,
  onExit: (code: number | null, log: string) => void,
  runDir?: string,
  extraEnv?: Record<string, string>,
): () => void {
  const scriptDir = mkdtempSync(join(tmpdir(), "croc-"));
  const wrapperPath = join(scriptDir, "pty_wrapper.py");
  writeFileSync(wrapperPath, PTY_WRAPPER_PY, { mode: 0o755 });

  const cwd = runDir ?? scriptDir;

  let proc: ChildProcess | null = null;
  let outputLog = "";
  let dead = false;

  const removeScriptDir = () => {
    try {
      rmSync(scriptDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  };

  const cleanup = () => {
    if (dead) return;
    dead = true;
    try {
      proc?.kill("SIGTERM");
    } catch {
      /* ignore */
    }
  };

  try {
    const pythonPath = findPython3Path();
    proc = spawn(pythonPath, [wrapperPath, crocPath, ...args], {
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
        removeScriptDir();
        onExit(code, cleanOutput(outputLog));
      }, 200);
    });

    proc.on("error", (err) => {
      cleanup();
      removeScriptDir();
      onExit(1, err.message);
    });
  } catch (err) {
    // Failure before spawn (e.g. Python 3 not found): ensure temp dir is removed.
    cleanup();
    removeScriptDir();
    onExit(1, String(err));
  }

  return cleanup;
}

/** Recursively sum file sizes. Returns undefined if any stat fails at top level. */
export function computeFileSize(paths: string[]): number | undefined {
  let total = 0;
  for (const p of paths) {
    try {
      const s = statSync(p);
      if (s.isDirectory()) {
        const sub = sumDirSize(p);
        if (sub === undefined) return undefined;
        total += sub;
      } else {
        total += s.size;
      }
    } catch {
      return undefined;
    }
  }
  return total;
}

function sumDirSize(dir: string): number | undefined {
  let total = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = sumDirSize(full);
        if (sub === undefined) return undefined;
        total += sub;
      } else {
        try {
          total += statSync(full).size;
        } catch {
          return undefined;
        }
      }
    }
  } catch {
    return undefined;
  }
  return total;
}

export function spawnCrocSend(
  crocPath: string,
  args: string[],
  onPhrase: PhraseCallback,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback,
): CrocProcess {
  let phrase = "";
  let completed = false;
  let cancelled = false;
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
      // Suppress callbacks if the consumer already cancelled the transfer —
      // the caller (e.g. useTransfer.cancel) is responsible for UI state in
      // that path. Only treat exit code 0 as success: a non-zero exit (e.g.
      // SIGTERM from Cancel) must not be reported as success even though the
      // code phrase was already captured.
      if (completed || cancelled) return;
      if (code === 0) {
        completed = true;
        onComplete({ success: true, phrase });
      } else {
        const detail = log.trim() ? `\n\n${log.trim().slice(-400)}` : "";
        onError(new Error(`croc exited with code ${code}${detail}`));
      }
    },
  );

  return {
    kill: () => {
      cancelled = true;
      kill();
    },
  };
}

export function spawnCrocReceive(
  crocPath: string,
  args: string[],
  codePhrase: string,
  downloadDir: string,
  onProgress: ProgressCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback,
): CrocProcess {
  let completed = false;
  let cancelled = false;
  const startMs = Date.now();

  mkdirSync(downloadDir, { recursive: true });

  // Snapshot directory contents before transfer (excluding hidden files)
  const beforeFiles = new Set(
    readdirSync(downloadDir).filter((f) => !f.startsWith(".")),
  );

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
    },
    (code, log) => {
      // Suppress callbacks if the consumer already cancelled the receive.
      if (completed || cancelled) return;
      completed = true;
      if (code === 0) {
        // Return files with original names — no renaming
        const afterFiles = readdirSync(downloadDir).filter(
          (f) => !f.startsWith("."),
        );
        const newFiles = afterFiles.filter((f) => !beforeFiles.has(f));
        const files = newFiles.map((f) => join(downloadDir, f));
        onComplete({ success: true, files });
      } else {
        const detail = log.trim() ? `\n\n${log.trim().slice(-400)}` : "";
        onError(new Error(`croc exited with code ${code}${detail}`));
      }
    },
    downloadDir,
    { CROC_SECRET: codePhrase },
  );

  return {
    kill: () => {
      cancelled = true;
      kill();
    },
  };
}
