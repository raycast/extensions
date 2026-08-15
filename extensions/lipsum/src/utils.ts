const MAX_NUMBER = 10_000;

export const safeNumberArg = (arg: string | undefined): number => {
  if (arg === undefined) {
    return 1;
  }
  const parsed = parseInt(arg, 10);
  return isNaN(parsed) ? 1 : Math.min(Math.max(0, parsed), MAX_NUMBER);
};
