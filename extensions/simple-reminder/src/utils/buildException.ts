export function buildException(error: Error, message: string, meta?: Record<string, string>) {
  return {
    error,
    message,
    ...(meta && { meta }),
  };
}
