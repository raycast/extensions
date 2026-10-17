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

  toggle(id: string): Promise<void> {
    const operation = this.queue.then(async () => {
      await this.load();
      const previous = this.ids;
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      this.publish(next);
      try {
        await this.storage.write(JSON.stringify([...next]));
      } catch (error) {
        this.publish(previous);
        throw error;
      }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
