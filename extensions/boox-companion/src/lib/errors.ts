export class BooxError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly cause?: unknown
  ) {
    super(message);
    this.name = "BooxError";
  }
}

export function describeBooxError(error: unknown): string {
  if (error instanceof BooxError) return error.message;
  if (error instanceof Error) {
    if (error.name === "AbortError" || error.name === "TimeoutError") return "The BOOX did not respond in time";
    if (/fetch failed|ECONNREFUSED|EHOSTUNREACH|ENETUNREACH/i.test(error.message)) {
      return "BOOXDrop is unavailable on the local network";
    }
    return error.message;
  }
  return String(error);
}
