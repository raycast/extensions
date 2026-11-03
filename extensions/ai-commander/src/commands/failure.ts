import { errorMessage, maskSecrets, ProviderError, type ProviderErrorKind } from "../core/errors";
import { StoreError } from "../prompts/store";
import { RenderError } from "../prompts/template/render";

export type FailureKind =
  | ProviderErrorKind
  | "no-selection"
  | "blank-selection"
  | "browser-extension"
  | "empty-input"
  | "missing-key"
  | "no-default-model"
  | "prompt-not-found"
  | "prompt-disabled"
  | "storage";

/** A failed run in a form the UI can show directly. Messages never contain user text or keys. */
export class RunFailure extends Error {
  constructor(
    readonly kind: FailureKind,
    readonly title: string,
    message: string,
  ) {
    super(message);
    this.name = "RunFailure";
  }
}

const PROVIDER_TITLES: Partial<Record<ProviderErrorKind, string>> = {
  auth: "Invalid API Key",
  "model-not-found": "Unknown Model",
  "rate-limit": "Rate Limit Reached",
  "out-of-credits": "Out of Credits",
  "provider-down": "Provider Unavailable",
  network: "Network Error",
  timeout: "Request Timed Out",
  "invalid-parameter": "Request Rejected",
  "no-strict-endpoint": "No Provider in Strict Mode",
  refusal: "Request Declined",
  "empty-result": "Empty Result",
  incomplete: "Incomplete Result",
  aborted: "Canceled",
};

/** Failures the user can only fix with a window: these open the session instead of showing a HUD. */
const NEEDS_WINDOW: ReadonlySet<FailureKind> = new Set([
  "auth",
  "missing-key",
  "model-not-found",
  "no-default-model",
  "no-strict-endpoint",
]);

/** Failures that a second attempt can solve, so trying again is the obvious next step. */
const TRANSIENT: ReadonlySet<FailureKind> = new Set([
  "rate-limit",
  "provider-down",
  "network",
  "timeout",
  "incomplete",
  "empty-result",
]);

export function needsWindow(failure: RunFailure): boolean {
  return NEEDS_WINDOW.has(failure.kind);
}

export function isTransient(failure: RunFailure): boolean {
  return TRANSIENT.has(failure.kind);
}

export function toRunFailure(error: unknown): RunFailure {
  if (error instanceof RunFailure) return error;
  if (error instanceof ProviderError) {
    return new RunFailure(error.kind, PROVIDER_TITLES[error.kind] ?? "Request Failed", maskSecrets(error.message));
  }
  if (error instanceof RenderError) {
    const kind = error.code === "empty-input" ? "empty-input" : "unknown";
    return new RunFailure(kind, "Cannot Build Prompt", error.message);
  }
  if (error instanceof StoreError) return new RunFailure("storage", "Storage Error", error.message);
  return new RunFailure("unknown", "Something Went Wrong", errorMessage(error));
}
