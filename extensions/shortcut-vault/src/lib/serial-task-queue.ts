export type SerialTaskQueue = {
  run<T>(task: () => Promise<T> | T): Promise<T>;
};

export function createSerialTaskQueue(): SerialTaskQueue {
  let tail = Promise.resolve();

  return {
    run<T>(task: () => Promise<T> | T): Promise<T> {
      const result = tail.then(task, task);
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
