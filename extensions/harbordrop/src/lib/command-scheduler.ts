import { IntegrationError } from "./errors";

type OperationKind = "background" | "refresh" | "action";

interface ScheduledOperation {
  kind: OperationKind;
  operation: () => Promise<void>;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
}

/** Serializes one command lifetime; callers own cancellation of active work. */
export class CommandScheduler {
  private disposed = false;
  private active = false;
  private queue: ScheduledOperation[] = [];
  private queuedRefresh?: ScheduledOperation;

  refresh(verify: boolean, operation: () => Promise<void>): Promise<void> {
    if (this.disposed) return this.cancelled();
    if (!verify && (this.active || this.queue.length > 0))
      return Promise.resolve();
    // Coalescing keeps the first callback and its original FIFO position.
    if (verify && this.queuedRefresh) return this.queuedRefresh.promise;
    return this.enqueue(verify ? "refresh" : "background", operation);
  }

  /** Every action is queued in FIFO order; the UI suppresses duplicate clicks. */
  action(operation: () => Promise<void>): Promise<void> {
    if (this.disposed) return this.cancelled();
    return this.enqueue("action", operation);
  }

  dispose(): void {
    this.disposed = true;
    this.queuedRefresh = undefined;
    for (const pending of this.queue.splice(0))
      pending.reject(new IntegrationError("cancelled"));
  }

  private cancelled(): Promise<void> {
    return Promise.reject(new IntegrationError("cancelled"));
  }

  private enqueue(
    kind: OperationKind,
    operation: () => Promise<void>,
  ): Promise<void> {
    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((onResolve, onReject) => {
      resolve = onResolve;
      reject = onReject;
    });
    const pending = { kind, operation, promise, resolve, reject };
    this.queue.push(pending);
    if (kind === "refresh") this.queuedRefresh = pending;
    this.startNext();
    return promise;
  }

  private startNext(): void {
    if (this.disposed || this.active) return;
    const pending = this.queue.shift();
    if (!pending) return;
    if (this.queuedRefresh === pending) this.queuedRefresh = undefined;
    this.active = true;
    void this.run(pending);
  }

  private async run(pending: ScheduledOperation): Promise<void> {
    try {
      await pending.operation();
      pending.resolve();
    } catch (error) {
      pending.reject(error);
    } finally {
      this.active = false;
      this.startNext();
    }
  }
}
