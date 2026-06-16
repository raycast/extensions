/** Coerces an unknown rejection/thrown value into an Error. */
export function toError(reason: unknown): Error {
  return reason instanceof Error ? reason : new Error(String(reason));
}

/**
 * Returns the first rejection reason from a settled-promise list as an Error,
 * or a fallback Error when none of the results rejected.
 */
export function firstRejectedError(results: PromiseSettledResult<unknown>[], fallbackMessage: string): Error {
  const rejected = results.find((result): result is PromiseRejectedResult => result.status === "rejected");

  if (!rejected) {
    return new Error(fallbackMessage);
  }

  return toError(rejected.reason);
}
