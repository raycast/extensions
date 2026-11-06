import { Gradient } from '../types';
import { assertGradient, normaliseGradient, MAX_STOPS } from './grad';

export const STORAGE_KEY = 'saved-gradients';
export type EntryRef = { index: number; snapshot: string };
export const entryRef = (g: Gradient, index: number): EntryRef => ({
  index,
  snapshot: JSON.stringify(g),
});
export type LibraryStorage = {
  get: () => Promise<string | undefined>;
  set: (value: string) => Promise<void>;
};

export function parseLibrary(raw: string | undefined): Gradient[] {
  if (raw === undefined) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value))
    throw new Error(
      'Saved library must be an array. Original data has not been changed.',
    );
  value.forEach((item) => assertGradient(item, Infinity));
  return value;
}

// Each operation reads storage afresh, never a hook's initial empty value.
// The queue serialises commands in this runtime. Recheck after any confirmation
// so a stale view or concurrent change cannot authorise replacing different data.
export function createLibrary(storage: LibraryStorage) {
  let queue: Promise<unknown> = Promise.resolve();
  const read = async () => parseLibrary(await storage.get());
  function change<T>(
    operation: (
      items: Gradient[],
    ) => Promise<{ items: Gradient[]; result: T } | undefined>,
  ): Promise<T | false> {
    const task = queue.then(async () => {
      const raw = await storage.get();
      const next = await operation(parseLibrary(raw));
      if (!next) return false as const;
      if ((await storage.get()) !== raw)
        throw new Error(
          'The library changed. Reopen Saved Gradients and try again.',
        );
      await storage.set(JSON.stringify(next.items));
      return next.result;
    });
    queue = task.catch(() => undefined);
    return task;
  }
  function locate(items: Gradient[], ref: EntryRef) {
    if (JSON.stringify(items[ref.index]) !== ref.snapshot)
      throw new Error(
        'This saved gradient changed. Reopen Saved Gradients and try again.',
      );
    return ref.index;
  }
  return {
    read,
    save: (
      value: Gradient,
      confirm: (label: string) => Promise<boolean>,
      ref?: EntryRef,
    ) =>
      change(async (items) => {
        const g = normaliseGradient(value);
        const source = ref ? locate(items, ref) : -1;
        const allowedStops =
          source < 0
            ? MAX_STOPS
            : Math.max(MAX_STOPS, items[source].stops.length);
        assertGradient(g, allowedStops);
        const collisions = items.flatMap((item, i) =>
          i !== source && g.label && item.label?.trim() === g.label ? [i] : [],
        );
        if (collisions.length && !(await confirm(g.label!))) return undefined;
        // All matching labels are explicitly replaced; unlabeled entries never collide.
        const next = items.filter(
          (_, i) => i !== source && !collisions.includes(i),
        );
        const index = source < 0 ? next.length : Math.min(source, next.length);
        next.splice(index, 0, g);
        return { items: next, result: entryRef(g, index) };
      }),
    remove: (ref: EntryRef) =>
      change(async (items) => {
        const index = locate(items, ref);
        return { items: items.filter((_, i) => i !== index), result: true };
      }),
  };
}
