import type { ProviderId } from "./types";

/** Tells the UI which follow-up action fits a failed request. */
export type ProviderErrorKind =
  | "auth"
  | "model-not-found"
  | "rate-limit"
  | "out-of-credits"
  | "provider-down"
  | "network"
  | "timeout"
  | "invalid-parameter"
  | "no-strict-endpoint"
  | "refusal"
  | "empty-result"
  | "incomplete"
  | "aborted"
  | "unknown";

/** Normalized failure of a provider call. `message` is safe to show to the user. */
export class ProviderError extends Error {
  constructor(
    readonly kind: ProviderErrorKind,
    message: string,
    readonly provider?: ProviderId,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Patterns that identify API keys of the supported providers. */
const SECRET_PATTERNS = [/sk-[A-Za-z0-9_-]{8,}/g, /AIza[A-Za-z0-9_-]{8,}/g, /Bearer\s+[A-Za-z0-9._-]{8,}/gi];

/** Removes anything that looks like an API key before text reaches the UI or a log. */
export function maskSecrets(text: string): string {
  return SECRET_PATTERNS.reduce((masked, pattern) => masked.replace(pattern, "[redacted]"), text);
}

/** The one way to turn a caught error into text for the UI, so that the masking cannot be forgotten. */
export function errorMessage(error: unknown): string {
  return maskSecrets(error instanceof Error ? error.message : String(error));
}
