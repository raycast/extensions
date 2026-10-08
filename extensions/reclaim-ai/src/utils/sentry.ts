import { captureException, EventHint, ExclusiveEventHintOrCaptureContext, Scope } from "@sentry/node";
import { useEffect } from "react";

export type Hint<E = unknown> = EventHint | Scope | ((data: { readonly error: E }) => EventHint | Scope);

const resolveHint = <E>(hint: Hint<E> | undefined, error: E) =>
  (typeof hint === "function" ? hint({ error }) : hint) as ExclusiveEventHintOrCaptureContext;

export type ErrorCoverageOptions<RETHROW extends boolean> = {
  readonly rethrow?: RETHROW;
  readonly onError?: (e: unknown) => Error;
  readonly hint?: Hint;
};

export function errorCoverage<T, RETHROW extends boolean>(
  cb: () => T,
  options: ErrorCoverageOptions<RETHROW> = {}
): RETHROW extends true ? T : T | undefined {
  const { rethrow, onError, hint } = options;

  try {
    return cb();
  } catch (e) {
    let error = e;
    if (onError) error = onError(e);
    captureException(error, resolveHint(hint, error));
    if (rethrow) throw error;
  }

  return undefined as T;
}

export const upgradeAndCaptureError = <E extends Error>(
  error: unknown,
  base: Constructor<E>,
  mutate: (error: unknown) => E,
  hint?: Hint<E>
): E => {
  const typedError = error instanceof base ? (error as E) : mutate(error);
  captureException(typedError, resolveHint(hint, typedError));
  return typedError;
};

export const redactData = <T extends object>(obj: T): T | "[[REDACT FAILED]]" =>
  obj
    ? errorCoverage(() =>
        Object.entries(obj).reduce(
          (obj, [key, value]) => ({
            ...obj,
            [key]: (() => {
              switch (typeof value) {
                case "string":
                  return value
                    .split("")
                    .map(() => "*")
                    .join("");
                case "object":
                  if (value === null) return null;
                  return redactData(value);
              }
            })(),
          }),
          obj
        )
      ) || "[[REDACT FAILED]]"
    : obj;

export type UseCaptureException<E> = {
  readonly mutate?: (error: unknown) => E;
  readonly hint?: Hint<E>;
};

export const useCaptureException = <E>(error: E, options: UseCaptureException<E> = {}) => {
  const { hint, mutate } = options;

  useEffect(() => {
    if (error) {
      const typedError = mutate ? mutate(error) : error;
      captureException(typedError, hint && resolveHint(hint, typedError));
    }
  }, [error]);
};
