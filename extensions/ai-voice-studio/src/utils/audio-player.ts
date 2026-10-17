import { spawn, execFileSync, ChildProcess } from "child_process";
import { writeFileSync, unlinkSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomUUID } from "crypto";

const PID_FILE = join(tmpdir(), "ai-voice-studio.pid");
const STOP_FILE = join(tmpdir(), "ai-voice-studio.stop");

export class AudioPlayer {
  private currentProcess: ChildProcess | null = null;
  private currentPid: number | undefined;
  private tempFiles: string[] = [];
  private stopped = false;
  private abortController = new AbortController();

  // Streaming PCM playback state
  private pcmBuffer = Buffer.alloc(0);
  private pcmQueue: string[] = [];
  private pcmFirstChunk = true;
  private pcmFinished = false;
  private pcmFirstChunkBytes = 0;
  private pcmChunkBytes = 0;
  private pcmSampleRate = 24000;
  private pcmPlaybackRate = 1;
  private pcmCurrentProcess: ChildProcess | null = null;
  private pcmCompletePromise: { resolve: () => void; reject: (error: Error) => void } | null = null;

  get signal(): AbortSignal {
    return this.abortController.signal;
  }

  /**
   * Play a single base64-encoded audio chunk.
   */
  async playAudio(base64Audio: string, format = "mp3", playbackRate = 1): Promise<void> {
    if (this.stopped) return;

    let tempPath = this.saveTempFile(base64Audio, format);

    if (format === "opus") {
      tempPath = this.convertOpusToWav(tempPath);
    }
    const playbackStartedAt = Date.now();

    return new Promise<void>((resolve, reject) => {
      const proc = spawn("afplay", buildAfplayArgs(tempPath, playbackRate));
      this.currentProcess = proc;
      const myPid = proc.pid;
      this.currentPid = myPid;

      writePidFile(myPid);

      proc.on("close", (code, signal) => {
        if (this.currentProcess === proc) {
          this.currentProcess = null;
        }
        if (this.currentPid === myPid) {
          this.currentPid = undefined;
        }
        removePidFileIfMatch(myPid);
        this.cleanupFile(tempPath);

        // External stop (SIGTERM via stopExternalPlayback) leaves a STOP_FILE
        // behind. Treat that as a graceful stop instead of throwing, so the
        // outer command doesn't surface a confusing "afplay exited with code N".
        const externallyStopped = signal === "SIGTERM" || hasStopRequestSince(playbackStartedAt);

        if (this.stopped || code === 0 || code === null || externallyStopped) {
          resolve();
        } else {
          reject(new Error(`afplay exited with code ${code}`));
        }
      });

      proc.on("error", (err) => {
        if (this.currentProcess === proc) {
          this.currentProcess = null;
        }
        if (this.currentPid === myPid) {
          this.currentPid = undefined;
        }
        removePidFileIfMatch(myPid);
        this.cleanupFile(tempPath);
        reject(err);
      });
    });
  }

  /**
   * Whether playback has been stopped.
   */
  isStopped(): boolean {
    return this.stopped;
  }

  /**
   * Stop the current playback.
   */
  stopPlayback(): void {
    this.stopped = true;
    if (!this.abortController.signal.aborted) {
      this.abortController.abort();
    }
    // Clear pending PCM queue so no further chunks spawn
    for (const file of this.pcmQueue) {
      this.cleanupFile(file);
    }
    this.pcmQueue = [];
    if (this.pcmCompletePromise) {
      this.pcmCompletePromise.resolve();
      this.pcmCompletePromise = null;
    }
    const pid = this.currentPid;
    if (this.currentProcess) {
      const proc = this.currentProcess;
      this.currentProcess = null;
      this.pcmCurrentProcess = null;
      this.currentPid = undefined;
      try {
        proc.kill("SIGTERM");
      } catch {
        // Process may already be dead
      }
    }
    removePidFileIfMatch(pid);
  }

  /**
   * Start a streaming PCM playback session. Subsequent pushPcm() calls
   * accumulate audio data; once the buffer reaches the chunk threshold, a
   * small WAV file is written and afplay is spawned. Multiple chunks play
   * sequentially in arrival order, with ~30-50ms gap between chunks at most.
   */
  startPcmStream(
    opts: {
      sampleRate?: number;
      playbackRate?: number;
      firstChunkMs?: number;
      chunkMs?: number;
    } = {},
  ): void {
    this.pcmBuffer = Buffer.alloc(0);
    this.pcmQueue = [];
    this.pcmFirstChunk = true;
    this.pcmFinished = false;
    this.pcmSampleRate = opts.sampleRate ?? 24000;
    this.pcmPlaybackRate = Number.isFinite(opts.playbackRate) && opts.playbackRate! > 0 ? opts.playbackRate! : 1;
    const bytesPerMs = (this.pcmSampleRate * 2) / 1000;
    this.pcmFirstChunkBytes = Math.max(2400, Math.floor((opts.firstChunkMs ?? 120) * bytesPerMs));
    this.pcmChunkBytes = Math.max(this.pcmFirstChunkBytes, Math.floor((opts.chunkMs ?? 500) * bytesPerMs));
  }

  /**
   * Push a chunk of raw PCM bytes into the streaming player. The first chunk
   * triggers playback once a small threshold is reached; later chunks queue up
   * and play back-to-back.
   */
  pushPcm(pcm: Buffer): void {
    if (this.stopped) return;
    if (pcm.length === 0) return;
    this.pcmBuffer = Buffer.concat([this.pcmBuffer, pcm]);
    const threshold = this.pcmFirstChunk ? this.pcmFirstChunkBytes : this.pcmChunkBytes;
    if (this.pcmBuffer.length >= threshold) {
      this.flushPcmBufferToFile();
    }
  }

  /**
   * Signal that no more PCM chunks will arrive. Resolves when all queued
   * chunks have finished playing (or when playback is stopped).
   */
  finishPcmStream(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pcmCompletePromise = { resolve, reject };
      if (this.pcmBuffer.length > 0) this.flushPcmBufferToFile();
      this.pcmFinished = true;
      this.maybePlayNextPcm();
    });
  }

  private flushPcmBufferToFile(): void {
    if (this.pcmBuffer.length === 0) return;
    const data = this.pcmBuffer;
    this.pcmBuffer = Buffer.alloc(0);
    this.pcmFirstChunk = false;

    const wav = wrapPcmAsWav(data, this.pcmSampleRate);
    const fileName = `ai-voice-studio-pcm-${randomUUID()}.wav`;
    const filePath = join(tmpdir(), fileName);
    writeFileSync(filePath, new Uint8Array(wav));
    this.tempFiles.push(filePath);
    this.pcmQueue.push(filePath);
    this.maybePlayNextPcm();
  }

  private maybePlayNextPcm(): void {
    if (this.stopped) {
      this.pcmQueue = [];
      if (this.pcmCompletePromise) {
        this.pcmCompletePromise.resolve();
        this.pcmCompletePromise = null;
      }
      return;
    }
    if (this.pcmCurrentProcess) return;
    if (this.pcmQueue.length === 0) {
      if (this.pcmFinished && this.pcmCompletePromise) {
        this.pcmCompletePromise.resolve();
        this.pcmCompletePromise = null;
      }
      return;
    }

    const file = this.pcmQueue.shift()!;
    const proc = spawn("afplay", buildAfplayArgs(file, this.pcmPlaybackRate));
    this.pcmCurrentProcess = proc;
    this.currentProcess = proc;
    const myPid = proc.pid;
    this.currentPid = myPid;
    writePidFile(myPid);

    proc.on("close", () => {
      if (this.pcmCurrentProcess === proc) this.pcmCurrentProcess = null;
      if (this.currentProcess === proc) this.currentProcess = null;
      if (this.currentPid === myPid) this.currentPid = undefined;
      removePidFileIfMatch(myPid);
      this.cleanupFile(file);
      this.maybePlayNextPcm();
    });

    proc.on("error", (err) => {
      if (this.pcmCurrentProcess === proc) this.pcmCurrentProcess = null;
      if (this.currentProcess === proc) this.currentProcess = null;
      // Mirror the close handler: the dead process must release its PID
      // record before a Stop Reading from another command happens to find
      // and probe a recycled pid. The non-PCM path already does this; the
      // PCM error handler was skipping both fields.
      if (this.currentPid === myPid) this.currentPid = undefined;
      removePidFileIfMatch(myPid);
      this.cleanupFile(file);
      if (this.pcmCompletePromise) {
        this.pcmCompletePromise.reject(err);
        this.pcmCompletePromise = null;
      }
    });
  }

  /**
   * Clean up all temp files and stop playback.
   */
  cleanup(): void {
    this.stopPlayback();
    for (const f of [...this.tempFiles]) {
      this.cleanupFile(f);
    }
    this.tempFiles = [];
  }

  private convertOpusToWav(opusPath: string): string {
    const wavPath = opusPath.replace(/\.opus$/, ".wav");
    try {
      execFileSync("ffmpeg", ["-y", "-i", opusPath, wavPath], { stdio: "ignore" });
    } catch {
      throw new Error("Opus playback requires ffmpeg. Install it with: brew install ffmpeg");
    }
    this.cleanupFile(opusPath);
    this.tempFiles.push(wavPath);
    return wavPath;
  }

  private saveTempFile(base64Audio: string, format: string): string {
    const buffer = Buffer.from(base64Audio, "base64");
    if (buffer.length === 0) {
      throw new Error("Decoded audio data is empty");
    }
    const extension = format.replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp3";
    const fileName = `ai-voice-studio-${randomUUID()}.${extension}`;
    const filePath = join(tmpdir(), fileName);
    writeFileSync(filePath, new Uint8Array(buffer));
    this.tempFiles.push(filePath);
    return filePath;
  }

  private cleanupFile(filePath: string): void {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath);
      }
    } catch {
      // ignore cleanup errors
    }
    this.tempFiles = this.tempFiles.filter((f) => f !== filePath);
  }
}

function wrapPcmAsWav(pcm: Buffer, sampleRate: number, bitDepth = 16, channels = 1): Buffer {
  const dataSize = pcm.length;
  const byteRate = (sampleRate * channels * bitDepth) / 8;
  const blockAlign = (channels * bitDepth) / 8;

  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcm]);
}

function buildAfplayArgs(filePath: string, playbackRate: number): string[] {
  const normalizedRate = Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
  if (Math.abs(normalizedRate - 1) < 0.001) {
    return [filePath];
  }

  return ["-r", normalizedRate.toFixed(2), "-q", "1", filePath];
}

// ---- PID file helpers for cross-command stop ----

function writePidFile(pid: number | undefined): void {
  if (pid === undefined) return;
  try {
    writeFileSync(PID_FILE, String(pid), "utf8");
  } catch {
    // ignore
  }
}

function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * Remove the PID file only if it still contains the expected PID.
 * Prevents a race where process B writes a new PID after process A finishes.
 */
function removePidFileIfMatch(expectedPid: number | undefined): void {
  if (expectedPid === undefined) return;
  try {
    if (!existsSync(PID_FILE)) return;
    const current = parseInt(readFileSync(PID_FILE, "utf8").trim(), 10);
    if (current === expectedPid) {
      unlinkSync(PID_FILE);
    }
  } catch {
    // ignore
  }
}

/**
 * Read the PID from the PID file and kill the afplay process.
 * Validates the PID belongs to afplay before killing to avoid
 * killing unrelated processes (TOCTOU mitigation).
 */
export function stopExternalPlayback(): boolean {
  try {
    if (!existsSync(PID_FILE)) {
      return false;
    }
    const pidStr = readFileSync(PID_FILE, "utf8").trim();
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
      removePidFile();
      return false;
    }

    // Verify the PID belongs to afplay before killing
    try {
      const comm = execFileSync("ps", ["-p", String(pid), "-o", "comm="], { encoding: "utf8" }).trim();
      if (!comm.includes("afplay")) {
        removePidFile();
        return false;
      }
    } catch {
      removePidFile();
      return false;
    }

    requestExternalStop();
    process.kill(pid, "SIGTERM");
    // Only remove the PID file if it still names the pid we just killed;
    // a concurrent Quick Read may have started between the kill and here
    // and written its own PID. Unconditional removal would leave that new
    // session unstoppable via Stop Reading.
    removePidFileIfMatch(pid);
    return true;
  } catch {
    removePidFile();
    return false;
  }
}

export function requestExternalStop(): void {
  writeStopRequest();
}

export function clearExternalStopRequest(): void {
  try {
    if (existsSync(STOP_FILE)) {
      unlinkSync(STOP_FILE);
    }
  } catch {
    // ignore
  }
}

export function hasExternalStopRequest(): boolean {
  return existsSync(STOP_FILE);
}

export async function waitForExternalStopPropagation(delayMs = 250): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

function hasStopRequestSince(timestamp: number): boolean {
  try {
    if (!existsSync(STOP_FILE)) return false;
    const raw = readFileSync(STOP_FILE, "utf8").trim();
    const stopRequestedAt = Number(raw);
    return Number.isFinite(stopRequestedAt) && stopRequestedAt >= timestamp;
  } catch {
    return false;
  }
}

function writeStopRequest(): void {
  try {
    writeFileSync(STOP_FILE, String(Date.now()), "utf8");
  } catch {
    // ignore
  }
}
