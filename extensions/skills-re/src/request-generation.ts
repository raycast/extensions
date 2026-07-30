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

export const invalidatePagination = (generation: ReturnType<typeof createRequestGeneration>) => {
  generation.invalidate();
  return { cursor: "", isDone: true } as const;
};
