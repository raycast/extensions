export class Semaphore {
  private slots: number;
  private readonly queue: (() => void)[] = [];

  constructor(max: number) {
    if (max < 1) throw new Error(`Semaphore max must be >= 1, got ${max}`);
    this.slots = max;
  }

  async acquire(): Promise<() => void> {
    if (this.slots === 0) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.slots--;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.slots++;
      this.queue.shift()?.();
    };
  }
}
