import { startSpanManual, StartSpanOptions, captureException, ExclusiveEventHintOrCaptureContext } from "@sentry/node";

export type ErrorCoverageOptions<RETHROW extends boolean> = {
  onError?: (e: unknown) => Error | boolean | undefined;
  noReport?: boolean;
  hint?: ExclusiveEventHintOrCaptureContext;
  rethrowExceptions?: RETHROW;
};

export type ErrorCoverageReturnType<T, RETHROW extends boolean> =
  | { status: "DATA"; data: T; error: never }
  | (RETHROW extends true ? never : { status: "ERROR"; data: never; error: unknown });

export function errorCoverage<T, RETHROW extends boolean>(
  spanOptions: StartSpanOptions,
  cb: () => Promise<T>,
  options?: ErrorCoverageOptions<RETHROW>
): Promise<ErrorCoverageReturnType<T, RETHROW>>;
export function errorCoverage<T, RETHROW extends boolean>(
  spanOptions: StartSpanOptions,
  cb: () => T,
  options?: ErrorCoverageOptions<RETHROW>
): ErrorCoverageReturnType<T, RETHROW>;
export function errorCoverage<T, RETHROW extends boolean>(
  spanOptions: StartSpanOptions,
  cb: () => T | Promise<T>,
  options: ErrorCoverageOptions<RETHROW> = {}
): ErrorCoverageReturnType<T, RETHROW> | Promise<ErrorCoverageReturnType<T, RETHROW>> {
  const { onError, noReport, hint, rethrowExceptions } = options;

  return startSpanManual(spanOptions, (span) => {
    const handleError = (error: unknown): ErrorCoverageReturnType<T, RETHROW> => {
      const result = onError?.(error);
      error = result instanceof Error ? result : error;
      if (result !== false && !noReport) captureException(error, hint);
      if (rethrowExceptions) throw error;
      return { status: "ERROR", data: undefined as never, error } as ErrorCoverageReturnType<T, RETHROW>;
    };

    let data: T | Promise<T> | undefined;

    try {
      data = cb();
    } catch (e) {
      return handleError(e);
    }

    if (data instanceof Promise)
      return data
        .then<ErrorCoverageReturnType<T, RETHROW>>((data) => ({ status: "DATA", data, error: undefined as never }))
        .catch((e) => handleError(e))
        .finally(() => span.end());
    else {
      span.end();
      return { status: "DATA", data, error: undefined as never };
    }
  });
}
