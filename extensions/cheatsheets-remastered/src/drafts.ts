import type { Lock } from "./storage";
export interface DraftStorage {
  getItem(key: string): Promise<unknown>;
  setItem(key: string, value: string | boolean): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
}
// Serialises each field and checks the last observed value under the cross-command lock.
export class DraftSession<T extends string | boolean> {
  private observed: unknown;
  private loaded = false;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: DraftStorage,
    private lock: Lock,
    private key: string,
    private defaultValue: T,
  ) {}
  async load(): Promise<T> {
    return this.lock(async () => {
      this.observed = await this.storage.getItem(this.key);
      if (this.observed !== undefined && typeof this.observed !== typeof this.defaultValue)
        throw new Error("Saved draft is invalid. Keep a copy of your text before recovery.");
      this.loaded = true;
      return this.observed === undefined ? this.defaultValue : (this.observed as T);
    });
  }
  save(value?: T): Promise<void> {
    const operation = this.queue.then(() =>
      this.lock(async () => {
        if (!this.loaded) throw new Error("Draft has not loaded. Retry before editing or saving.");
        const current = await this.storage.getItem(this.key);
        if (current !== this.observed)
          throw new Error("Draft changed in another command. Copy your text, then reopen the form.");
        if (value === undefined) await this.storage.removeItem(this.key);
        else await this.storage.setItem(this.key, value);
        this.observed = value;
      }),
    );
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
