/** Applies an async load only if no newer request or user edit has superseded it. */
export function createLatestLoad<T>() {
  let revision = 0;
  return {
    invalidate() {
      revision++;
    },
    async run(
      load: () => Promise<T>,
      apply: (value: T) => void,
      onError: (error: unknown) => void | Promise<void>,
    ) {
      const request = ++revision;
      try {
        const value = await load();
        if (request === revision) apply(value);
      } catch (error) {
        if (request === revision) await onError(error);
      }
    },
  };
}
