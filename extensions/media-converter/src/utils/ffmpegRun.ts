import { spawn } from "child_process";
import { runProcess, type ProcessSpec } from "./process";

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
 * updates back to the caller. The process is spawned without a shell so paths
 * and filenames are passed to FFmpeg literally.
 */
export async function runFFmpegWithProgress(
  spec: ProcessSpec,
  opts: {
    totalDurationSec?: number;
    onProgress?: (p: ProgressInfo) => void;
    signal?: AbortSignal;
  } = {},
): Promise<{ stdout: string; stderr: string }> {
  const { totalDurationSec, onProgress, signal } = opts;
  const args = ["-progress", "pipe:1", "-nostats", ...spec.args];

  return new Promise((resolve, reject) => {
    const child = spawn(spec.command, args, {
      shell: false,
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
      if (signal?.aborted) {
        const error = new Error("Conversion cancelled");
        error.name = "AbortError";
        reject(error);
        return;
      }
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
    await runProcess({ command: ffmpegPath, args: ["-hide_banner", "-i", filePath] });
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
