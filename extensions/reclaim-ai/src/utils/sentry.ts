import { captureException, Scope, Span, startInactiveSpan, StartSpanOptions, withActiveSpan } from "@sentry/react";
import { useEffect } from "react";

export type ResolvableSpan = Span | StartSpanOptions;

const SCRAPER_SPAN = startInactiveSpan({ name: "SCRAPER_SPANA" });
export const SpanClass = SCRAPER_SPAN.constructor;

export const resolveSpan = (span: ResolvableSpan): Span =>
  span instanceof SpanClass ? (span as Span) : startInactiveSpan(span as StartSpanOptions);

export const captureInSpan = (span: ResolvableSpan, e: unknown): never => {
  withActiveSpan(resolveSpan(span), () => {
    captureException(e);
  });

  throw e;
};

export type ErrorCoverageWithSpanOptions<RETHROW extends boolean> = {
  readonly rethrow?: RETHROW;
  readonly onError?: (e: unknown) => Error;
};

export function errorCoverage<T, RETHROW extends boolean>(
  span: ResolvableSpan,
  cb: (helpers: { span: Span; scope: Scope }) => T,
  options: ErrorCoverageWithSpanOptions<RETHROW> = {}
): RETHROW extends true ? T : T | undefined {
  const { rethrow, onError } = options;
  const _span = resolveSpan(span);
  return withActiveSpan(_span, (scope) => {
    try {
      return cb({ span: _span, scope });
    } catch (e) {
      let error = e;
      if (onError) error = onError(e);
      captureException(error);
      if (rethrow) throw error;
    }
  }) as T;
}

export const useCaptureInSpan = (span: ResolvableSpan, error: unknown) => {
  useEffect(() => {
    if (error) captureInSpan(span, error);
  }, [error]);
};
