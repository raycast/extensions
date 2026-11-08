import type { LauncherApplication } from "../models/application.ts";
import type { StorageAdapter } from "./state-repository.ts";

export const RECENT_APPLICATIONS_KEY = "appsolutely.recentApplications";
const HISTORY_LIMIT = 50;

/** Shared, ordered launch history. Paths distinguish multiple installations of an app. */
export class RecentApplications {
  private paths: string[] = [];
  private listeners = new Set<() => void>();
  private loading?: Promise<void>;
  private queue: Promise<unknown> = Promise.resolve();

  private storage: StorageAdapter;

  constructor(storage: StorageAdapter) {
    this.storage = storage;
  }

  getSnapshot = (): string[] => this.paths;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  load = (): Promise<void> => {
    if (!this.loading) {
      this.loading = (async () => {
        const raw = await this.storage.getItem(RECENT_APPLICATIONS_KEY);
        if (!raw) return;
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          return;
        }
        if (Array.isArray(parsed)) {
          this.paths = [
            ...new Set(parsed.filter((path): path is string => typeof path === "string" && path.length > 0)),
          ].slice(0, HISTORY_LIMIT);
          for (const listener of this.listeners) listener();
        }
      })().catch((error) => {
        this.loading = undefined;
        throw error;
      });
    }
    return this.loading;
  };

  record = (path: string): Promise<void> => {
    const pending = this.queue.then(async () => {
      await this.load();
      const paths = [path, ...this.paths.filter((previous) => previous !== path)].slice(0, HISTORY_LIMIT);
      await this.storage.setItem(RECENT_APPLICATIONS_KEY, JSON.stringify(paths));
      this.paths = paths;
      for (const listener of this.listeners) listener();
    });
    this.queue = pending.catch(() => undefined);
    return pending;
  };
}

export function recentApplications(
  paths: string[],
  applications: LauncherApplication[],
  limit: number,
): LauncherApplication[] {
  const byPath = new Map(applications.map((app) => [app.path, app]));
  return paths
    .flatMap((path) => {
      const app = byPath.get(path);
      return app ? [app] : [];
    })
    .slice(0, limit);
}
