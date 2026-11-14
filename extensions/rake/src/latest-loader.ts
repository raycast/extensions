type LatestLoaderOptions<T> = {
  load: () => Promise<T>;
  onStart: () => void;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => Promise<void>;
  onFinish: () => void;
};

export function createLatestLoader<T>(options: LatestLoaderOptions<T>) {
  let generation = 0;

  return {
    async run() {
      const request = ++generation;
      options.onStart();

      try {
        const value = await options.load();
        if (request === generation) options.onSuccess(value);
      } catch (error) {
        if (request === generation) await options.onError(error);
      } finally {
        if (request === generation) options.onFinish();
      }
    },
    invalidate() {
      generation++;
    },
  };
}
