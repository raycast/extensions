export interface FavoritesStorage {
  read(): Promise<string | undefined>;
  write(value: string): Promise<void>;
}

export function parseFavorites(raw: string | undefined): Set<string> {
  try {
    const value: unknown = raw ? JSON.parse(raw) : [];
    return new Set(
      Array.isArray(value) ? value.filter((id): id is string => typeof id === "string" && !!id.trim()) : [],
    );
  } catch {
    return new Set();
  }
}

export class FavoritesStore {
  private ids: ReadonlySet<string> = new Set();
  private listeners = new Set<() => void>();
  private ready?: Promise<void>;
  private queue = Promise.resolve();

  constructor(private readonly storage: FavoritesStorage) {}

  getSnapshot = () => this.ids;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(ids: ReadonlySet<string>) {
    this.ids = ids;
    this.listeners.forEach((listener) => listener());
  }

  load(): Promise<void> {
    this.ready ??= this.storage.read().then((raw) => {
      this.publish(parseFavorites(raw));
    });
    return this.ready.catch((error: unknown) => {
      this.ready = undefined;
      throw error;
    });
  }

  /**
   * Adds or removes an ID. With a limit, an addition that would exceed it is refused and resolves to false.
   * The limit is checked against the latest saved set, so rapid additions cannot overshoot it.
   */
  toggle(id: string, limit = Infinity): Promise<boolean> {
    return this.update((ids) => {
      const next = new Set(ids);
      if (next.has(id)) next.delete(id);
      else if (next.size >= limit) return undefined;
      else next.add(id);
      return next;
    });
  }

  /** Removes every ID in one write, so a failure restores the whole set. */
  clear(): Promise<boolean> {
    return this.update((ids) => (ids.size ? new Set<string>() : undefined));
  }

  /** Applies changes one at a time to the latest set; `change` returns undefined to leave it as is. */
  private update(change: (ids: ReadonlySet<string>) => Set<string> | undefined): Promise<boolean> {
    const operation = this.queue.then(async () => {
      await this.load();
      const previous = this.ids;
      const next = change(previous);
      if (!next) return false;
      this.publish(next);
      try {
        await this.storage.write(JSON.stringify([...next]));
      } catch (error) {
        this.publish(previous);
        throw error;
      }
      return true;
    });
    this.queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }
}
