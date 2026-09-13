export class RequestTimeoutError extends Error {
  override readonly name = "RequestTimeoutError";
}

export function isRequestTimeoutError(value: unknown): value is RequestTimeoutError {
  return value instanceof RequestTimeoutError;
}
