import { existsSync } from "node:fs";

// Paths only, in memory. Never copy or persist the user's screenshots.
export class PreviewCache {
  private paths = new Map<string, string>();
  private pending = new Map<string, Promise<string>>();

  constructor(private readonly capacity = 32) {}

  get(key: string): string | undefined {
    const path = this.paths.get(key);
    if (!path) return undefined;
    this.paths.delete(key);
    if (!existsSync(path)) return undefined;
    this.paths.set(key, path);
    return path;
  }

  load(key: string, loader: () => Promise<string>): Promise<string> {
    const cached = this.get(key);
    if (cached) return Promise.resolve(cached);
    const pending = this.pending.get(key);
    if (pending) return pending;
    const request = loader()
      .then((path) => {
        if (!existsSync(path))
          throw new Error("Screenshot file is unavailable.");
        this.paths.set(key, path);
        while (this.paths.size > this.capacity) {
          this.paths.delete(this.paths.keys().next().value!);
        }
        return path;
      })
      .finally(() => this.pending.delete(key));
    this.pending.set(key, request);
    return request;
  }
}
