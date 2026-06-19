export class Semaphore {
  private slots: number;
  private readonly queue: (() => void)[] = [];

  constructor(max: number) {
    if (max < 1) throw new Error(`Semaphore max must be >= 1, got ${max}`);
    this.slots = max;
  }

  async acquire(): Promise<() => void> {
    if (this.slots > 0) {
      this.slots--;
    } else {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.queue.shift();
      if (next) next();
      else this.slots++;
    };
  }
}
