export const createRequestGeneration = () => {
  let current = 0;

  return {
    capture: () => current,
    invalidate: () => {
      current += 1;
    },
    isCurrent: (generation: number) => generation === current,
  };
};

export const createSingleFlight = () => {
  let isRunning = false;

  return async <T>(operation: () => Promise<T>): Promise<T | undefined> => {
    if (isRunning) {
      return undefined;
    }

    isRunning = true;
    try {
      return await operation();
    } finally {
      isRunning = false;
    }
  };
};

export const invalidatePagination = (generation: ReturnType<typeof createRequestGeneration>) => {
  generation.invalidate();
  return { cursor: "", isDone: true } as const;
};
