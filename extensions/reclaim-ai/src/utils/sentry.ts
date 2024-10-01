import { startSpanManual, StartSpanOptions, captureException, ExclusiveEventHintOrCaptureContext } from "@sentry/node";

export type ErrorCoverageOptions = {
  onError?: (e: unknown) => boolean | undefined;
  noReport?: boolean;
  hint?: ExclusiveEventHintOrCaptureContext;
};

export const errorCoverage = (spanOptions: StartSpanOptions, cb: () => unknown, options: ErrorCoverageOptions = {}) => {
  const { onError, noReport, hint } = options;

  const handleError = (e: unknown) => {
    const result = onError?.(e);
    if (result !== false && !noReport) captureException(e, hint);
  };

  startSpanManual(spanOptions, (span) => {
    let result: unknown;
    try {
      result = cb();
    } catch (e) {
      handleError(e);
    } finally {
      if (result instanceof Promise) result.catch((e) => handleError(e)).finally(() => span.end());
      else span.end();
    }
  });
};
