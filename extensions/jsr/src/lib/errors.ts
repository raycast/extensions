import { captureException } from "@raycast/api";

/**
 * Default `onError` handler for `@raycast/utils` hooks. Forwards to
 * `captureException` for telemetry, but silently drops `AbortError`s
 * triggered by in-flight requests being cancelled on unmount / arg change.
 */
export const onErrorCapture = (err: Error): void => {
  if (err.name === "AbortError") return;
  captureException(err);
};
