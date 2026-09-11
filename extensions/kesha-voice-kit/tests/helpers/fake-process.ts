import { EventEmitter } from "node:events";
import type { ChildProcess, SpawnOptions } from "node:child_process";
import { vi } from "vitest";

export class FakeProcess extends EventEmitter {
  pid = 1234;
  exitCode: number | null = null;
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    destroyed: false,
    end: vi.fn(() => {
      this.stdin.destroyed = true;
    }),
  };
  kill = vi.fn();

  emitStdout(value: string) {
    this.stdout.emit("data", Buffer.from(value));
  }

  emitStderr(value: string) {
    this.stderr.emit("data", Buffer.from(value));
  }

  exit(code: number | null) {
    this.exitCode = code;
    this.emit("exit", code);
  }

  asChild(): ChildProcess {
    return this as unknown as ChildProcess;
  }
}

export function createSpawnRecorder() {
  const calls: Array<{
    command: string;
    args: string[];
    options: SpawnOptions;
  }> = [];
  const processes: FakeProcess[] = [];
  const spawn = vi.fn(
    (command: string, args: string[], options: SpawnOptions) => {
      calls.push({ command, args, options });
      const proc = new FakeProcess();
      processes.push(proc);
      return proc.asChild();
    },
  );
  return { spawn, calls, processes };
}
