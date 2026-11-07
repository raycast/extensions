// One-at-a-time task queue for LocalStorage writes. Pure: no Raycast or Node imports.
//
// Two quick actions (pin, move, a recency stamp during a switch) each start an async write; without a queue their
// read-modify-write steps can interleave and an older value can land last. The queue runs each task after the previous
// one settles, in call order. A failed task rejects its own caller and does not stop the tasks after it.

export type Enqueue = <T>(task: () => Promise<T>) => Promise<T>;

export function serialQueue(): Enqueue {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task);
    tail = run.catch(() => undefined);
    return run;
  };
}
