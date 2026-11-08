import { emptyState } from "../models/folder.ts";
import type { LauncherState } from "../models/folder.ts";
import { decodeState, encodeState } from "./state-codec.ts";

export const STORAGE_KEY = "appsolutely.layout";

export interface StorageAdapter {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

export interface LayoutSnapshot {
  state: LauncherState;
  status: "loading" | "ready" | "error";
  warning?: string;
  error?: Error;
}

/** One queue and one snapshot shared by every pushed navigation view. */
export class LayoutRepository {
  private snapshot: LayoutSnapshot = { state: emptyState(), status: "loading" };
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  getSnapshot = (): LayoutSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(snapshot: LayoutSnapshot): void {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  load = (): Promise<void> => {
    if (this.loading) return this.loading;
    this.publish({ ...this.snapshot, status: "loading", error: undefined });
    this.loading = (async () => {
      try {
        const raw = await this.storage.getItem(STORAGE_KEY);
        const { state, recovered } = decodeState(raw);
        if (recovered && raw !== undefined) {
          // Preserve the original before permitting any writes to a repaired layout.
          await this.storage.setItem(`${STORAGE_KEY}.recovery.${Date.now()}`, raw);
        }
        this.publish({
          state,
          status: "ready",
          warning: recovered
            ? "Your layout was repaired. A copy of the original was saved in local storage."
            : undefined,
        });
      } catch (error) {
        this.publish({ ...this.snapshot, status: "error", error: toError(error) });
      }
    })();
    return this.loading;
  };

  retry = async (): Promise<void> => {
    await this.queue;
    this.loading = undefined;
    await this.load();
  };

  update = (operation: (state: LauncherState) => LauncherState): Promise<void> => {
    const pending = this.queue.then(async () => {
      await this.load();
      if (this.snapshot.status !== "ready") throw this.snapshot.error ?? new Error("Layout is not available.");
      const next = operation(this.snapshot.state);
      await this.storage.setItem(STORAGE_KEY, encodeState(next));
      // A failed save never appears as a successful move in any open view.
      this.publish({ state: next, status: "ready" });
    });
    this.queue = pending.catch(() => undefined);
    return pending;
  };
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
