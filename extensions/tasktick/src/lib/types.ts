// src/lib/types.ts
export type TaskKind = "scheduled" | "manual";
export type TaskStatus = "idle" | "running";

export interface Task {
  id: string;
  shortId: string;
  name: string;
  kind: TaskKind;
  enabled: boolean;
  status: TaskStatus;
  scheduleSummary: string;
  lastRunAt?: string;
  lastRunDurationSec?: number;
  lastExitCode?: number;
  createdAt: string;
}

export interface ExecutionLogLine {
  ts: string;
  stream: "stdout" | "stderr";
  text: string;
}

export interface ExecutionLog {
  executionId: string;
  taskId: string;
  startedAt: string;
  endedAt?: string;
  exitCode?: number;
  stdout: string;
  stderr: string;
  lines: ExecutionLogLine[];
}

export type LifecycleEvent =
  | { type: "started"; id: string; executionId: string; ts: string }
  | {
      type: "completed";
      id: string;
      executionId: string;
      exitCode: number;
      ts: string;
    };
