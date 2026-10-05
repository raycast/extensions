import type { StoredSource } from "./source-catalog";
import type { DockScan } from "./unread-count";

export type DockScanner = (sources: readonly StoredSource[], timeout: number) => Promise<DockScan>;

const backgroundScanTimeout = 10_000;
const accessCheckTimeout = 60_000;

export class DockScanCoordinator {
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly scan: DockScanner) {}

  background(sources: readonly StoredSource[]): Promise<DockScan> {
    return this.enqueue(sources, backgroundScanTimeout);
  }

  accessCheck(sources: readonly StoredSource[]): Promise<DockScan> {
    return this.enqueue(sources, accessCheckTimeout);
  }

  private enqueue(sources: readonly StoredSource[], timeout: number): Promise<DockScan> {
    const task = this.tail.then(() => this.scan(sources, timeout));
    this.tail = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }
}
