import type { ReadingProgress } from "../domain/book";

/**
 * Serializes reading progress writes and keeps only the newest snapshot. Turning pages quickly
 * starts a write per page; without this a slow earlier write could land after a newer one and
 * restore a stale position.
 */
export class ProgressWriter {
  private pending: ReadingProgress | null = null;
  private running = false;

  constructor(private readonly write: (progress: ReadingProgress) => Promise<void>) {}

  /**
   * Resolves when the queue this call started is drained. Calls made while a write is in flight
   * resolve immediately; their snapshot is still written, and errors surface on the running call.
   */
  async save(progress: ReadingProgress): Promise<void> {
    this.pending = progress;
    if (this.running) {
      return;
    }
    this.running = true;
    let failure: unknown = null;
    try {
      while (this.pending !== null) {
        const next = this.pending;
        this.pending = null;
        try {
          await this.write(next);
          failure = null;
        } catch (error) {
          // Keep draining: a queued newer snapshot still has to reach disk, and writing it
          // makes this failure irrelevant.
          failure = error;
        }
      }
    } finally {
      this.running = false;
    }
    if (failure !== null) {
      throw failure;
    }
  }
}
