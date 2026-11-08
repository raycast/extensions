type IconLoader = (path: string) => Promise<string | undefined>;
export type ApplicationIconSnapshot = ReadonlyMap<string, string | undefined>;

/** Shares large-view icon requests across navigation views without starting idle work. */
export class ApplicationIconStore {
  private snapshot: ApplicationIconSnapshot = new Map();
  private listeners = new Set<() => void>();
  private requests = new Map<string, number>();
  private queued = new Set<string>();
  private running = new Set<string>();
  private generation = 0;
  private notification?: ReturnType<typeof setTimeout>;
  private loadIcon: IconLoader;

  constructor(loadIcon: IconLoader) {
    this.loadIcon = loadIcon;
  }

  getSnapshot = (): ApplicationIconSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  acquire = (paths: string[]): (() => void) => {
    const requested = new Set(paths);
    for (const path of requested) {
      const count = this.requests.get(path) ?? 0;
      this.requests.set(path, count + 1);
      if (!this.snapshot.has(path) && !this.running.has(path)) this.queued.add(path);
    }
    this.pump();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      for (const path of requested) {
        const count = this.requests.get(path)! - 1;
        if (count) this.requests.set(path, count);
        else {
          this.requests.delete(path);
          this.queued.delete(path);
        }
      }
    };
  };

  /** Refresh cached icons after the application catalog is refreshed. */
  invalidate = () => {
    this.generation++;
    this.snapshot = new Map();
    for (const path of this.requests.keys()) {
      if (!this.running.has(path)) this.queued.add(path);
    }
    this.notify();
    this.pump();
  };

  /** Share the same bounded queue and cache with folder previews. */
  resolve = (paths: string[], signal?: AbortSignal): Promise<ApplicationIconSnapshot> => {
    if (signal?.aborted) return Promise.resolve(new Map());
    const requested = [...new Set(paths)];
    return new Promise((resolve) => {
      let release = () => {};
      const finish = () => {
        unsubscribe();
        signal?.removeEventListener("abort", check);
        release();
        resolve(signal?.aborted ? new Map() : new Map(requested.map((path) => [path, this.snapshot.get(path)])));
      };
      const check = () => {
        if (signal?.aborted || requested.every((path) => this.snapshot.has(path))) finish();
      };
      const unsubscribe = this.subscribe(check);
      signal?.addEventListener("abort", check, { once: true });
      release = this.acquire(requested);
      check();
    });
  };

  private notify() {
    if (this.notification) return;
    this.notification = setTimeout(() => {
      this.notification = undefined;
      for (const listener of this.listeners) listener();
    }, 16);
  }

  private publish(path: string, image: string | undefined) {
    if (!this.requests.has(path)) return;
    if (this.snapshot.has(path) && this.snapshot.get(path) === image) return;
    this.snapshot = new Map(this.snapshot).set(path, image);
    this.notify();
  }

  private pump() {
    while (this.running.size < 4 && this.queued.size) {
      const path = this.queued.values().next().value!;
      this.queued.delete(path);
      this.running.add(path);
      void this.load(path);
    }
  }

  private async load(path: string) {
    const generation = this.generation;
    try {
      // A mode change can release a request before its worker has started.
      await Promise.resolve();
      if (this.requests.has(path)) {
        const image = await this.loadIcon(path);
        if (generation === this.generation) this.publish(path, image);
      }
    } catch {
      if (generation === this.generation) this.publish(path, undefined);
    } finally {
      this.running.delete(path);
      if (generation !== this.generation && this.requests.has(path)) this.queued.add(path);
      this.pump();
    }
  }
}
