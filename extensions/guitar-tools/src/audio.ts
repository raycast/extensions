import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { Analyzer, PCMFrames, SAMPLE_RATE, type Reading } from "./detector";

type SpawnProcess = (command: string, args: string[]) => ChildProcessWithoutNullStreams;
type Options = {
  device: string;
  onReading: (reading: Reading) => void;
  onError: (message: string) => void;
  spawnProcess?: SpawnProcess;
  soxPath?: string;
};
const session: { current?: Capture } = {};

export function findSox(): string {
  const path = ["/opt/homebrew/bin/sox", "/usr/local/bin/sox", "/usr/bin/sox"].find(existsSync);
  if (!path) throw new Error("SoX is not installed. Run: brew install sox.");
  return path;
}

export class Capture {
  private child?: ChildProcessWithoutNullStreams;
  private stopped = false;
  private started = false;
  private predecessor: Promise<void> = Promise.resolve();
  private finished = false;
  private resolveClosed!: () => void;
  private closed = new Promise<void>((resolve) => {
    this.resolveClosed = resolve;
  });
  private watchdog?: ReturnType<typeof setTimeout>;
  private forceKill?: ReturnType<typeof setTimeout>;

  constructor(private options: Options) {}

  async start() {
    if (this.started || this.stopped) return;
    this.started = true;
    const older = session.current;
    session.current = this;
    this.predecessor = older ? older.stop() : Promise.resolve();
    await this.predecessor;
    if (this.stopped) {
      this.finish();
      return;
    }
    try {
      const path = this.options.soxPath || findSox();
      const input = this.options.device ? ["-t", "coreaudio", this.options.device] : ["-d"];
      // One persistent recording; no shell, no WAV/temp files, no audio playback.
      this.child = (this.options.spawnProcess || spawn)(path, [
        "-q",
        ...input,
        "-c",
        "1",
        "-r",
        String(SAMPLE_RATE),
        "-b",
        "16",
        "-e",
        "signed-integer",
        "-L",
        "-t",
        "raw",
        "-",
        "highpass",
        "30",
      ]);
      const frames = new PCMFrames();
      const analyzer = new Analyzer();
      let stderr = "";
      const resetWatchdog = () => {
        clearTimeout(this.watchdog);
        this.watchdog = setTimeout(() => {
          if (!this.stopped)
            this.options.onError("No audio data received. Check the connection and Raycast's Microphone permission.");
          void this.stop();
        }, 8000);
      };
      resetWatchdog();
      this.child.stdout.on("data", (data: Buffer) => {
        if (this.stopped) return;
        resetWatchdog();
        frames.push(data, (frame) => {
          if (!this.stopped) this.options.onReading(analyzer.analyze(frame));
        });
      });
      this.child.stderr.on("data", (data: Buffer) => {
        stderr = (stderr + data.toString()).slice(-2000);
      });
      this.child.on("error", (error) => {
        if (!this.stopped) this.options.onError(error.message);
        this.finish();
      });
      this.child.on("close", (code) => {
        if (!this.stopped) this.options.onError(stderr.trim() || `Audio capture stopped (code ${code}).`);
        this.finish();
      });
    } catch (error) {
      if (!this.stopped) this.options.onError(error instanceof Error ? error.message : String(error));
      this.finish();
    }
  }

  stop(): Promise<void> {
    if (this.stopped) return this.closed;
    this.stopped = true;
    clearTimeout(this.watchdog);
    if (this.child && !this.finished) {
      this.child.kill("SIGTERM");
      if (!this.finished) {
        this.forceKill = setTimeout(() => this.child?.kill("SIGKILL"), 1500);
        this.forceKill.unref();
      }
    } else {
      // Preserve the shutdown chain even if this pending session was cancelled.
      void this.predecessor.then(() => this.finish());
    }
    return this.closed;
  }

  private finish() {
    if (this.finished) return;
    this.finished = true;
    clearTimeout(this.watchdog);
    clearTimeout(this.forceKill);
    this.resolveClosed();
  }
}
