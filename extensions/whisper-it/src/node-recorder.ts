import { spawn, ChildProcess } from "child_process";
import debug from "debug";
import { Readable } from "stream";

const log = debug("record");

interface RecorderOptions {
  sampleRate?: number;
  channels?: number;
  compress?: boolean;
  threshold?: number;
  thresholdStart?: number | null;
  thresholdEnd?: number | null;
  silence?: string;
  recorder?: "sox";
  endOnSilence?: boolean;
  audioType?: "wav" | "mp3" | "raw";
}

interface RecorderConfig {
  cmd: string;
  args: string[];
  spawnOptions?: Record<string, unknown>;
}

// Recorder configurations
const recorders: Record<string, (options: Required<RecorderOptions>) => RecorderConfig> = {
  sox: (options) => ({
    cmd: "/opt/homebrew/bin/rec",
    args: [
      "-q",
      "-t",
      options.audioType,
      "-b",
      "16",
      "-r",
      options.sampleRate.toString(),
      "-c",
      options.channels.toString(),
      "-",
      "silence",
      "1",
      "0.1",
      `${options.thresholdStart || options.threshold}%`,
      "1",
      options.silence,
      `${options.thresholdEnd || options.threshold}%`,
    ],
    spawnOptions: {
      encoding: "binary",
      stdio: "pipe",
    },
  }),
};

export class Recording {
  private readonly options: Required<RecorderOptions>;
  private process: ChildProcess | null = null;
  private stream: Readable | null = null;
  private readonly cmd: string;
  private readonly args: string[];
  private readonly cmdOptions: Record<string, unknown>;

  constructor(options: RecorderOptions = {}) {
    this.options = {
      sampleRate: 16000,
      channels: 1,
      compress: false,
      threshold: 0.5,
      thresholdStart: null,
      thresholdEnd: null,
      silence: "1.0",
      recorder: "sox",
      endOnSilence: false,
      audioType: "mp3",
      ...options,
    };

    const recorder = recorders[this.options.recorder];
    if (!recorder) {
      throw new Error(`Unsupported recorder: ${this.options.recorder}`);
    }

    const config = recorder(this.options);
    this.cmd = config.cmd;
    this.args = config.args;
    this.cmdOptions = {
      encoding: "binary",
      stdio: "pipe",
      ...config.spawnOptions,
    };

    log("Starting recording with options:", this.options);
    log(`Command: ${this.cmd} ${this.args.join(" ")}`);
  }

  start(): this {
    const cp = spawn(this.cmd, this.args, this.cmdOptions);
    const rec = cp.stdout;
    const err = cp.stderr;

    if (!rec || !err) {
      throw new Error("Failed to initialize recording streams");
    }

    this.process = cp;
    this.stream = rec;

    cp.on("close", (code) => {
      if (code === 0) return;
      rec.emit(
        "error",
        new Error(`${this.cmd} has exited with error code ${code}. Enable debugging with DEBUG=record`),
      );
    });

    err.on("data", (chunk: Buffer) => {
      log(`STDERR: ${chunk.toString()}`);
    });

    rec.on("data", (chunk: Buffer) => {
      log(`Recording ${chunk.length} bytes`);
    });

    rec.on("end", () => {
      log("Recording ended");
    });

    return this;
  }

  stop(): void {
    if (!this.process) {
      throw new Error("Recording not yet started");
    }
    this.process.kill();
  }

  pause(): void {
    if (!this.process || !this.stream) {
      throw new Error("Recording not yet started");
    }
    this.process.kill("SIGSTOP");
    this.stream.pause();
    log("Paused recording");
  }

  resume(): void {
    if (!this.process || !this.stream) {
      throw new Error("Recording not yet started");
    }
    this.process.kill("SIGCONT");
    this.stream.resume();
    log("Resumed recording");
  }

  isPaused(): boolean {
    if (!this.stream) {
      throw new Error("Recording not yet started");
    }
    return this.stream.isPaused();
  }

  getStream(): Readable {
    if (!this.stream) {
      throw new Error("Recording not yet started");
    }
    return this.stream;
  }
}

export const record = (options?: RecorderOptions): Recording => new Recording(options);
