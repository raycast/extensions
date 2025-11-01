// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const buildException = (error: Error, message: string, meta?: Record<string, any>) => {
  return {
    error,
    message,
    ...(meta && { meta }),
  };
};
