import { startSpanManual, StartSpanOptions, captureException, ExclusiveEventHintOrCaptureContext } from "@sentry/node";

export type ErrorCoverageOptions = {
  onError?: (e: unknown) => Error | boolean | undefined;
  noReport?: boolean;
  hint?: ExclusiveEventHintOrCaptureContext;
  rethrowExceptions?: boolean;
};

export type ErrorCoverageReturnType<T> =
  | { status: "DATA"; data: T; error: never }
  | { status: "ERROR"; data: never; error: unknown };

export function errorCoverage<T>(
  spanOptions: StartSpanOptions,
  cb: () => Promise<T>,
  options?: ErrorCoverageOptions
): Promise<ErrorCoverageReturnType<T>>;
export function errorCoverage<T>(
  spanOptions: StartSpanOptions,
  cb: () => T,
  options?: ErrorCoverageOptions
): ErrorCoverageReturnType<T>;
export function errorCoverage<T>(
  spanOptions: StartSpanOptions,
  cb: () => T | Promise<T>,
  options: ErrorCoverageOptions = {}
): ErrorCoverageReturnType<T> | Promise<ErrorCoverageReturnType<T>> {
  const { onError, noReport, hint, rethrowExceptions } = options;

  return startSpanManual(spanOptions, (span) => {
    const handleError = (error: unknown): ErrorCoverageReturnType<T> => {
      const result = onError?.(error);
      error = result instanceof Error ? result : error;
      if (result !== false && !noReport) captureException(error, hint);
      if (rethrowExceptions) throw error;
      return { status: "ERROR", data: undefined as never, error };
    };

    let data: T | Promise<T> | undefined;

    try {
      data = cb();
    } catch (e) {
      return handleError(e);
    }

    if (data instanceof Promise)
      return data
        .then<ErrorCoverageReturnType<T>>((data) => ({ status: "DATA", data, error: undefined as never }))
        .catch((e) => handleError(e))
        .finally(() => span.end());
    else {
      span.end();
      return { status: "DATA", data, error: undefined as never };
    }
  });
}
