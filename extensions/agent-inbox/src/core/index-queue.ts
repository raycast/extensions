import { IndexProgress, SessionSearchIndex } from "./search";
import { Session } from "./types";

/** Coalesce refreshes without interrupting a transcript that is already being indexed. */
export class IndexQueue {
  private pending?: Session[];
  private running?: Promise<void>;
  private controller = new AbortController();

  constructor(
    private index: Pick<SessionSearchIndex, "update">,
    private callbacks: {
      busy: (value: boolean) => void;
      progress: (value: IndexProgress) => void;
      completed: () => void;
      failed: () => void;
    },
  ) {}

  update(sessions: Session[]): Promise<void> {
    if (this.controller.signal.aborted) return Promise.resolve();
    this.pending = sessions;
    this.running ??= this.drain().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }

  dispose() {
    this.pending = undefined;
    this.controller.abort();
  }

  private async drain(): Promise<void> {
    const { signal } = this.controller;
    this.callbacks.busy(true);
    while (this.pending && !signal.aborted) {
      const sessions = this.pending;
      this.pending = undefined;
      try {
        const progress = await this.index.update(
          sessions,
          (value) => {
            if (!signal.aborted) this.callbacks.progress(value);
          },
          signal,
        );
        if (!signal.aborted) {
          this.callbacks.progress(progress);
          this.callbacks.completed();
        }
      } catch {
        if (!signal.aborted) this.callbacks.failed();
      }
    }
    if (!signal.aborted) this.callbacks.busy(false);
  }
}
