// Values saved in LocalStorage, changed one update at a time so none is lost or shown before it is saved.

/**
 * Holds the saved values for one library. Each `update` runs after the ones before it and builds on the
 * newest value, so a view opened earlier (a pushed preview) can't overwrite a later save. The value changes,
 * and `onChange` hears of it, only once `write` succeeded; a failed write rejects and leaves the value as it was.
 */
export class SavedStore<T extends object> {
  private value: T;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    initial: T,
    private readonly write: <K extends keyof T>(field: K, value: T[K]) => Promise<void>,
    private readonly onChange: (value: T) => void,
  ) {
    this.value = initial;
  }

  get current(): T {
    return this.value;
  }

  /** Takes the saved value once it is read. Updates asked for meanwhile wait and apply on top of it. */
  load(loading: Promise<T>): Promise<void> {
    const run = this.queue.then(async () => {
      this.value = await loading;
      this.onChange(this.value);
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  /** Saves `change` applied to the newest value. Resolves to whether anything changed. */
  update<K extends keyof T>(field: K, change: (value: T[K]) => T[K]): Promise<boolean> {
    const run = this.queue.then(async () => {
      const next = change(this.value[field]);
      if (next === this.value[field]) return false;
      await this.write(field, next);
      this.value = { ...this.value, [field]: next };
      this.onChange(this.value);
      return true;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }
}
