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
    this.proc = spawn(this.cliPath, ["events"], {
      stdio: ["ignore", "pipe", "pipe"],
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

    this.proc.on("exit", () => {
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
