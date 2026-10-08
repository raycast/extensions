// src/lib/events.ts
import { spawn, ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import readline from "node:readline";
import type { LifecycleEvent } from "./types";

export interface EventsStreamOptions {
  initialBackoffMs?: number;
  maxBackoffMs?: number;
}

export interface EventsStreamEvents {
  started: (ev: { id: string; executionId: string; ts: string }) => void;
  completed: (ev: {
    id: string;
    executionId: string;
    exitCode: number;
    ts: string;
  }) => void;
  error: (err: Error) => void;
}

export class EventsStream extends EventEmitter {
  private proc: ChildProcess | null = null;
  private retryTimer: NodeJS.Timeout | null = null;
  private retries = 0;
  private killed = false;
  private readonly initialBackoff: number;
  private readonly maxBackoff: number;

  constructor(
    private cliPath: string,
    opts: EventsStreamOptions = {},
  ) {
    super();
    this.initialBackoff = opts.initialBackoffMs ?? 1000;
    this.maxBackoff = opts.maxBackoffMs ?? 60_000;
    this.start();
  }

  private start() {
    if (this.killed) return;
    // stderr is "ignore" (not "pipe") because we never read it — leaving it
    // piped without a consumer would deadlock the subprocess once the OS
    // pipe buffer fills (typically 64 KB on macOS).
    this.proc = spawn(this.cliPath, ["events"], {
      stdio: ["ignore", "pipe", "ignore"],
    });
    const rl = readline.createInterface({ input: this.proc.stdout! });

    rl.on("line", (line) => {
      try {
        const ev = JSON.parse(line) as LifecycleEvent;
        this.emit(ev.type, ev);
        this.retries = 0;
      } catch {
        // ignore parse errors
      }
    });

    // Listen on "close" rather than "exit": when spawn itself fails
    // (ENOENT, EACCES), Node emits "error" followed by "close" but NOT
    // "exit", so the auto-reconnect timer would never arm for that case.
    this.proc.on("close", () => {
      this.proc = null;
      if (this.killed) return;
      const backoff = Math.min(
        this.maxBackoff,
        this.initialBackoff * Math.pow(2, this.retries),
      );
      this.retries += 1;
      this.retryTimer = setTimeout(() => {
        this.retryTimer = null;
        this.start();
      }, backoff);
    });

    this.proc.on("error", (err) => this.emit("error", err));
  }

  kill() {
    this.killed = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
    if (this.proc) {
      this.proc.kill("SIGTERM");
      this.proc = null;
    }
  }

  isAlive(): boolean {
    return this.proc !== null;
  }
}
