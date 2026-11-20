import { errorMessage, isCancelled, recoveryHint } from "./errors";
import { GhosthandClient } from "./ghosthand-client";
import { withLease } from "./leases";
import type { Phone, TaskUpdate } from "./types";

export type TaskState = TaskUpdate & {
  status: "running" | "stopping" | "completed" | "stopped" | "failed";
  error?: string;
  notice?: string;
};

/** One user submission owns one execution, independent of view renders. */
export class TaskRun {
  private controller = new AbortController();
  private started = false;
  private attachedViews = 0;
  private listeners = new Set<() => void>();
  private state: TaskState = { status: "running", text: "", progress: "Acquiring exclusive control" };

  constructor(
    private readonly client: GhosthandClient,
    readonly phone: Phone,
    readonly prompt: string,
    readonly streaming: boolean,
  ) {}

  snapshot = () => this.state;
  attachView = () => {
    this.attachedViews += 1;
    let detached = false;
    return () => {
      if (detached) return;
      detached = true;
      this.attachedViews -= 1;
      // Development renderers can replay effect setup/cleanup without leaving the view.
      // Allow a synchronous reattachment before interpreting cleanup as navigation away.
      queueMicrotask(() => {
        if (this.attachedViews === 0) this.cancel();
      });
    };
  };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private update(change: Partial<TaskState>) {
    this.state = { ...this.state, ...change };
    this.listeners.forEach((listener) => listener());
  }
  cancel = () => {
    if (!["running", "stopping"].includes(this.state.status)) return;
    this.update({ status: "stopping", progress: "Stopping and releasing control…" });
    this.controller.abort();
  };
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    try {
      const result = await withLease(
        this.client,
        this.phone,
        "Run a user-submitted iPhone task",
        this.controller.signal,
        async (lease) => {
          this.update({ notice: lease.notice, progress: "Starting Ghosthand-hosted AI task" });
          return this.client.task(lease.id, this.prompt, this.streaming, this.controller.signal, (update) => {
            if (!this.controller.signal.aborted) this.update(update);
          });
        },
      );
      this.update({ text: result.text, status: "completed", progress: "Task completed · Control released" });
    } catch (error) {
      // A cleanup failure must remain visible even when cancellation caused the initial error.
      const stopped = isCancelled(error);
      this.update({
        status: stopped ? "stopped" : "failed",
        progress: stopped ? "Task stopped · Control released" : "Task not confirmed complete",
        error: stopped
          ? "Actions already performed on the iPhone are not undone."
          : `${errorMessage(error)}\n\n${recoveryHint(error)}`,
      });
    }
  }
}
