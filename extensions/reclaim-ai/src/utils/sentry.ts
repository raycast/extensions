import {
  captureException,
  EventHint,
  ExclusiveEventHintOrCaptureContext,
  Scope,
  Span,
  startInactiveSpan,
  StartSpanOptions,
  withActiveSpan,
} from "@sentry/react";
import { useEffect, useMemo } from "react";

export type ResolvableSpan = Span | StartSpanOptions;
export type Hint = EventHint | Scope | ((data: { readonly error: unknown; readonly span: Span }) => Hint | Scope);

const SCRAPER_SPAN = startInactiveSpan({ name: "SCRAPER_SPANA" });
export const SpanClass = SCRAPER_SPAN.constructor;

export const resolveSpan = (span: ResolvableSpan): Span =>
  span instanceof SpanClass ? (span as Span) : startInactiveSpan(span as StartSpanOptions);

const resolveHint = (hint: Hint | undefined, error: unknown, span: Span) =>
  (typeof hint === "function" ? hint({ span, error }) : hint) as ExclusiveEventHintOrCaptureContext;

export const captureInSpan = <E>(span: ResolvableSpan, error: E, hint?: Hint): E => {
  const _span = resolveSpan(span);
  withActiveSpan(resolveSpan(_span), () => {
    captureException(error, resolveHint(hint, error, _span));
  });

  return error;
};

export type ErrorCoverageWithSpanOptions<RETHROW extends boolean> = {
  readonly rethrow?: RETHROW;
  readonly onError?: (e: unknown) => Error;
  readonly hint?: Hint;
};

export function errorCoverage<T, RETHROW extends boolean>(
  span: ResolvableSpan,
  cb: (helpers: { span: Span; scope: Scope }) => T,
  options: ErrorCoverageWithSpanOptions<RETHROW> = {}
): RETHROW extends true ? T : T | undefined {
  const { rethrow, onError, hint } = options;
  const _span = resolveSpan(span);

  return withActiveSpan(_span, (scope) => {
    try {
      return cb({ span: _span, scope });
    } catch (e) {
      let error = e;
      if (onError) error = onError(e);
      captureException(error, resolveHint(hint, error, _span));
      if (rethrow) throw error;
    }
  }) as T;
}

export type UseCaptureInSpanOptions = {
  readonly mutate?: (error: unknown) => Error;
  readonly hint?: Hint;
};

export const useCaptureInSpan = (span: ResolvableSpan, error: unknown, options: UseCaptureInSpanOptions = {}) => {
  const { mutate, hint } = options;
  useEffect(() => {
    if (error) captureInSpan(span, mutate ? mutate(error) : error, hint);
  }, [error]);
};

export const useSpanWithFallback = (span: ResolvableSpan | undefined, fallback: ResolvableSpan): Span => {
  const defined = span || fallback;
  return useMemo(() => resolveSpan(defined), [defined]);
};

export const useSpanWithParent = (parent: ResolvableSpan | undefined, span: StartSpanOptions): Span => {
  const resolvedParent = useMemo(() => parent && resolveSpan(parent), [parent]);
  return useMemo(() => startInactiveSpan({ ...span, parentSpan: resolvedParent }), [span, resolvedParent]);
};

export const upgradeAndCaptureError = <E extends Error>(
  span: ResolvableSpan,
  error: unknown,
  base: Constructor<Error>,
  mutate: (error: unknown) => E,
  hint?: Hint
): E => {
  if (!(error instanceof base)) error = mutate(error);
  return captureInSpan(span, error as E, hint);
};
