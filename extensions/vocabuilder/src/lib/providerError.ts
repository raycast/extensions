import type { ProviderId } from "./providers/types";

/**
 * Tagged-cause Error for every provider-derived failure (translate + TTS).
 * The cause is a discriminated union by `domain` ("infrastructure" vs "outcome").
 * See AGENTS.md → Error Handling for routing rules and the retry policy.
 */

export type ProviderInfrastructureKind =
  | "network-offline"
  | "invalid-api-key"
  | "model-not-found"
  | "invalid-base-url"
  | "request-failed"
  | "invalid-response"
  | "empty-response"
  | "provider-undetected"
  | "missing-model";

export type ProviderOutcomeKind = "word-not-found" | "invalid-word-input" | "invalid-text-input";

export type ProviderErrorKind = ProviderInfrastructureKind | ProviderOutcomeKind;

export type ProviderErrorSurface = "translate" | "tts";

export type RateLimitDiagnostics = {
  message?: string;
  quotaMetric?: string;
  quotaId?: string;
  quotaModel?: string;
  quotaLocation?: string;
  retryDelay?: string;
};

export type ProviderInfrastructureCause = {
  domain: "infrastructure";
  kind: ProviderInfrastructureKind;
  surface: ProviderErrorSurface;
  /** `"unknown"` only for `provider-undetected`, where no provider could be chosen. */
  provider: ProviderId | "unknown";
  model?: string;
  /**
   * Host of the configured endpoint, set only when it is not the provider's
   * default. Disambiguates a 404 — a bad model and a bad base URL look
   * identical to the transport. Host-only, via `hostForLog`.
   */
  endpointHost?: string;
  status?: number;
  body?: string;
  rateLimit?: RateLimitDiagnostics;
};

/** Pipeline verdicts, not transport failures, so they carry no provider. */
export type ProviderOutcomeCause = {
  domain: "outcome";
  kind: ProviderOutcomeKind;
  // Locked literal — widen to ProviderErrorSurface if TTS ever gains an outcome kind.
  surface: "translate";
};

export type ProviderErrorCause = ProviderInfrastructureCause | ProviderOutcomeCause;

export type ProviderError = Error & { cause: ProviderErrorCause };

export function providerError(cause: ProviderErrorCause): ProviderError {
  return new Error(cause.kind, { cause }) as ProviderError;
}

export function isProviderError(e: unknown): e is ProviderError {
  if (!(e instanceof Error)) return false;
  const c = e.cause;
  if (typeof c !== "object" || c === null) return false;
  return "kind" in c && "surface" in c && "domain" in c;
}

export function isOutcome(err: unknown): err is ProviderError & { cause: ProviderOutcomeCause } {
  return isProviderError(err) && err.cause.domain === "outcome";
}

/** A failure that may succeed on retry: transport-level (offline) or 5xx/429/408. Outcomes are never transient. */
export function isTransient(err: ProviderError): boolean {
  if (err.cause.domain !== "infrastructure") return false;
  if (err.cause.kind === "network-offline") return true;
  if (err.cause.kind !== "request-failed") return false;
  const status = err.cause.status;
  return typeof status === "number" && (status >= 500 || status === 429 || status === 408);
}

/**
 * Flatten a ProviderError (or any unknown failure) into structured log fields.
 * Lives here — alongside RateLimitDiagnostics — so the projection cannot
 * drift between translate and TTS call sites.
 */
export function providerErrorLogFields(err: unknown): Record<string, unknown> {
  if (!isProviderError(err)) {
    return { error: err instanceof Error ? err.name : "unknown" };
  }
  const cause = err.cause;
  const infra = cause.domain === "infrastructure" ? cause : undefined;
  const rateLimit = infra?.rateLimit;
  return {
    error: cause.kind,
    domain: cause.domain,
    provider: infra?.provider,
    status: infra?.status,
    quotaMetric: rateLimit?.quotaMetric,
    quotaId: rateLimit?.quotaId,
    quotaModel: rateLimit?.quotaModel,
    quotaLocation: rateLimit?.quotaLocation,
    retryDelay: rateLimit?.retryDelay,
    message: rateLimit?.message,
  };
}
