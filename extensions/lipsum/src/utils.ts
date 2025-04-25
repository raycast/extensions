const MAX_NUMBER = 10_000;

export const safeNumberArg = (arg: string | undefined): number => {
  if (arg === undefined) {
    return 1;
  }
  const parsed = parseInt(arg, 10);
  return isNaN(parsed) ? 0 : Math.min(parsed, MAX_NUMBER);
};
