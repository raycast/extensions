import type { StorageAdapter } from "./state-repository.ts";
import { toError } from "./state-repository.ts";

export const VIEW_MODES = ["grid", "grid-large", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];
export const VIEW_MODE_LABELS: Record<ViewMode, string> = { grid: "Grid", "grid-large": "Grid (Large)", list: "List" };
export const VIEW_MODE_KEY = "appsolutely.viewMode";

export function isViewMode(value: string | undefined): value is ViewMode {
  return VIEW_MODES.some((mode) => mode === value);
}

export function nextViewMode(mode: ViewMode): ViewMode {
  return VIEW_MODES[(VIEW_MODES.indexOf(mode) + 1) % VIEW_MODES.length];
}

interface ViewSnapshot {
  mode: ViewMode;
  isLoading: boolean;
  error?: Error;
}

export class ViewPreference {
  private snapshot: ViewSnapshot = { mode: "grid", isLoading: true };
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();
  private savedMode: ViewMode = "grid";
  private change = 0;
  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  getSnapshot = (): ViewSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private publish(snapshot: ViewSnapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }

  load = (): Promise<void> => {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const saved = await this.storage.getItem(VIEW_MODE_KEY);
        this.savedMode = isViewMode(saved) ? saved : "grid";
        this.publish({ mode: this.change ? this.snapshot.mode : this.savedMode, isLoading: false });
      } catch (error) {
        this.publish({ ...this.snapshot, isLoading: false, error: toError(error) });
      }
    })();
    return this.loading;
  };

  setMode = (mode: ViewMode): Promise<void> => {
    const change = ++this.change;
    // Controlled selectors need the chosen value before the asynchronous save completes.
    this.publish({ ...this.snapshot, mode });
    const pending = this.queue.then(async () => {
      await this.load();
      try {
        await this.storage.setItem(VIEW_MODE_KEY, mode);
        this.savedMode = mode;
        if (change === this.change && this.snapshot.error) this.publish({ mode, isLoading: false });
      } catch (error) {
        if (change === this.change) this.publish({ mode: this.savedMode, isLoading: false });
        throw error;
      }
    });
    this.queue = pending.catch(() => undefined);
    return pending;
  };
}
