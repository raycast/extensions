import { spawn } from "child_process";
import { execPromise } from "./exec";

export type ProgressInfo = {
  percent: number; // 0-100
  processedSec: number;
  totalSec: number;
  etaSec?: number;
  fps?: number;
  speed?: number; // e.g. 1.2 means 1.2x realtime
};

/**
 * Spawn an FFmpeg process with `-progress pipe:1 -nostats` and stream progress
 * updates back to the caller. `cmd` must be a full command string that begins
 * with the quoted ffmpeg path and ends with the output target. We append the
 * progress flags just before the final output argument by prepending them to
 * the already-built command (FFmpeg is tolerant of global options anywhere
 * before the next `-i`, but for robustness we wrap the command via `sh -c`).
 *
 * This is intentionally simple: we rely on the shell to parse the command
 * (matching how `execPromise(cmd)` works today), and we just inject the
 * progress flags at the very end, which FFmpeg accepts as per-output options
 * but also honors at the global level.
 */
export async function runFFmpegWithProgress(
  cmd: string,
  opts: {
    totalDurationSec?: number;
    onProgress?: (p: ProgressInfo) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { totalDurationSec, onProgress, signal } = opts;
  // Insert `-progress pipe:1 -nostats` immediately after the ffmpeg binary path
  // so they're global options. The command starts with `"<path>" -i ...`.
  // Find the first space after the (possibly quoted) binary.
  const injected = injectGlobalFlags(cmd, "-progress pipe:1 -nostats");

  return new Promise((resolve, reject) => {
    const child = spawn(injected, {
      shell: true,
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let buffer = "";
    const started = Date.now();

    const abortHandler = () => {
      try {
        child.kill("SIGTERM");
      } catch {
        /* ignore */
      }
    };
    if (signal) {
      if (signal.aborted) {
        abortHandler();
      } else {
        signal.addEventListener("abort", abortHandler, { once: true });
      }
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      buffer += text;

      // FFmpeg emits progress as key=value lines terminated by `progress=continue|end`.
      let idx: number;
      while ((idx = buffer.indexOf("progress=")) !== -1) {
        const nl = buffer.indexOf("\n", idx);
        if (nl === -1) break;
        const block = buffer.slice(0, nl);
        buffer = buffer.slice(nl + 1);
        if (onProgress) {
          const info = parseProgressBlock(block, totalDurationSec, started);
          if (info) onProgress(info);
        }
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (signal) signal.removeEventListener("abort", abortHandler);
      reject(err);
    });

    child.on("close", (code) => {
      if (signal) signal.removeEventListener("abort", abortHandler);
      if (code === 0) {
        if (onProgress && totalDurationSec && totalDurationSec > 0) {
          onProgress({ percent: 100, processedSec: totalDurationSec, totalSec: totalDurationSec });
        }
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim() || stdout.trim()}`));
      }
    });
  });
}

export function injectGlobalFlags(cmd: string, flags: string): string {
  // Binary path may be quoted with spaces (e.g. `"/path/to/ffmpeg" -i ...`).
  if (cmd.startsWith('"')) {
    const closingQuote = cmd.indexOf('"', 1);
    if (closingQuote !== -1) {
      return cmd.slice(0, closingQuote + 1) + " " + flags + cmd.slice(closingQuote + 1);
    }
  }
  const firstSpace = cmd.indexOf(" ");
  if (firstSpace === -1) return cmd + " " + flags;
  return cmd.slice(0, firstSpace) + " " + flags + cmd.slice(firstSpace);
}

export function parseProgressBlock(
  block: string,
  totalDurationSec: number | undefined,
  startedAt: number,
): ProgressInfo | null {
  const lines = block.split("\n");
  const kv = new Map<string, string>();
  for (const line of lines) {
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    kv.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  const outTimeMs = kv.get("out_time_ms");
  const outTimeUs = kv.get("out_time_us");
  const outTime = kv.get("out_time");
  let processedSec = NaN;
  if (outTimeMs && !Number.isNaN(Number(outTimeMs))) {
    processedSec = Number(outTimeMs) / 1_000_000; // FFmpeg reports microseconds as out_time_ms (historical bug/quirk)
  } else if (outTimeUs && !Number.isNaN(Number(outTimeUs))) {
    processedSec = Number(outTimeUs) / 1_000_000;
  } else if (outTime) {
    processedSec = parseFfmpegTimestamp(outTime);
  }
  if (!Number.isFinite(processedSec) || processedSec < 0) return null;

  const total = totalDurationSec && totalDurationSec > 0 ? totalDurationSec : undefined;
  const percent = total ? Math.max(0, Math.min(100, (processedSec / total) * 100)) : 0;

  const fps = Number(kv.get("fps"));
  const speedStr = kv.get("speed"); // e.g. "1.23x"
  const speed = speedStr ? Number(speedStr.replace("x", "")) : undefined;

  let etaSec: number | undefined;
  if (total && processedSec > 0.1) {
    const remaining = total - processedSec;
    const elapsed = (Date.now() - startedAt) / 1000;
    const effectiveSpeed =
      speed && Number.isFinite(speed) && speed > 0 ? speed : processedSec / Math.max(elapsed, 0.001);
    if (effectiveSpeed > 0) etaSec = remaining / effectiveSpeed;
  }

  return {
    percent,
    processedSec,
    totalSec: total ?? 0,
    etaSec,
    fps: Number.isFinite(fps) ? fps : undefined,
    speed: Number.isFinite(speed as number) ? speed : undefined,
  };
}

function parseFfmpegTimestamp(ts: string): number {
  // "HH:MM:SS.mmm"
  const parts = ts.split(":");
  if (parts.length !== 3) return NaN;
  const [h, m, s] = parts.map(Number);
  if ([h, m, s].some((n) => Number.isNaN(n))) return NaN;
  return h * 3600 + m * 60 + s;
}

/**
 * Probe the duration of a media file in seconds by parsing `ffmpeg -i` stderr.
 * Returns null if the duration line is missing or unparseable (e.g. image inputs).
 * We intentionally don't rely on `ffprobe` since the bundled static binary
 * may ship without it.
 */
export async function probeDurationSec(ffmpegPath: string, filePath: string): Promise<number | null> {
  try {
    await execPromise(`"${ffmpegPath}" -hide_banner -i "${filePath}"`);
  } catch (err: unknown) {
    // `ffmpeg -i` with no output exits non-zero after printing metadata.
    const stderr =
      typeof err === "object" && err !== null && "stderr" in err ? String((err as { stderr: unknown }).stderr) : "";
    const msg =
      typeof err === "object" && err !== null && "message" in err ? String((err as { message: unknown }).message) : "";
    return parseDurationFromStderr(stderr || msg);
  }
  return null;
}

export function parseDurationFromStderr(stderr: string): number | null {
  const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3]);
  if ([h, m, s].some((n) => Number.isNaN(n))) return null;
  return h * 3600 + m * 60 + s;
}
