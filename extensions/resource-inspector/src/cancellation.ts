// Filesystem calls such as readdir/realpath have no AbortSignal option. Wait for
// the current call to settle, then check cancellation before doing more work.
export async function cancellableIO<T>(
  signal: AbortSignal | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  signal?.throwIfAborted();
  try {
    return await operation();
  } finally {
    signal?.throwIfAborted();
  }
}

// A replacement must await all work from the cancelled run, including filesystem
// calls that cannot be interrupted. Rapid refreshes skip superseded queued runs.
export class LatestTask {
  private controller?: AbortController;
  private pending: Promise<unknown> = Promise.resolve();

  cancel() {
    this.controller?.abort();
  }

  run<T>(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    this.cancel();
    const controller = new AbortController();
    this.controller = controller;
    const next = this.pending
      .catch(() => {})
      .then(async () => {
        controller.signal.throwIfAborted();
        return operation(controller.signal);
      });
    // Keep a handled tail even if an unmounted caller discards its result.
    this.pending = next.catch(() => {});
    return next;
  }
}
