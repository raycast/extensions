import { captureException } from "@raycast/api";
import { isProviderError } from "./providerError";

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

/**
 * Report only failures that are unexpected by the app.
 *
 * Provider failures already have stable user-facing handling, and aborts are
 * normal control flow. Everything else should reach Raycast's Extension Issue
 * Dashboard even when a command catches it to preserve a usable UI.
 */
export function reportUnexpectedError(error: unknown): void {
  if (isProviderError(error) || isAbortError(error)) return;
  captureException(error);
}
