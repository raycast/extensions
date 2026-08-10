type ErrorWithCode = Error & { code?: string };

function describeCause(cause: Error): string {
  if (cause instanceof AggregateError && cause.errors.length > 0 && cause.errors[0] instanceof Error) {
    return describeCause(cause.errors[0]);
  }

  const code = (cause as ErrorWithCode).code;
  if (cause.message !== "") {
    return code !== undefined && !cause.message.includes(code) ? `${cause.message} (${code})` : cause.message;
  }

  return code ?? cause.name;
}

/**
 * Node's fetch wraps the interesting part (DNS, TLS, connection errors)
 * in `error.cause` and only reports "fetch failed" itself.
 */
export function describeFetchError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  if (error.cause instanceof Error) {
    return describeCause(error.cause);
  }

  return error.message;
}
