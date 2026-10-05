let globalQueue: Promise<unknown> = Promise.resolve();

export function enqueueSerialized<T>(task: () => Promise<T>): Promise<T> {
  const next = globalQueue.then(task, task);
  globalQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}
