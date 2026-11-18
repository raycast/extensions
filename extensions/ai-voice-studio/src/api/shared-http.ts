interface RequestWithTimeoutOptions<KnownError extends Error> {
  isKnownError: (error: unknown) => error is KnownError;
  mapAbort: () => Error;
  mapTimeout: (seconds: number) => Error;
  mapUnknown: (error: unknown) => Error;
  signal?: AbortSignal;
  timeoutMs: number;
}

export async function requestWithTimeout<T, KnownError extends Error>(
  options: RequestWithTimeoutOptions<KnownError>,
  request: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs);
  const abortHandler = () => controller.abort();
  options.signal?.addEventListener("abort", abortHandler, { once: true });

  try {
    return await request(controller.signal);
  } catch (error) {
    if (options.isKnownError(error)) throw error;
    if (options.signal?.aborted) throw options.mapAbort();
    if (error instanceof Error && error.name === "AbortError") {
      throw options.mapTimeout(options.timeoutMs / 1000);
    }
    throw options.mapUnknown(error);
  } finally {
    clearTimeout(timeoutId);
    options.signal?.removeEventListener("abort", abortHandler);
  }
}
