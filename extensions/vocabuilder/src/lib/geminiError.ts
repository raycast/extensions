/**
 * Tagged-cause Error for every Gemini-derived failure (translate + TTS).
 * The cause is a discriminated union by `domain` ("infrastructure" vs "outcome").
 * See AGENTS.md → Error Handling for routing rules and the retry policy.
 */

export type GeminiInfrastructureKind =
  | "network-offline"
  | "invalid-api-key"
  | "model-not-found"
  | "request-failed"
  | "invalid-response"
  | "empty-response";

export type GeminiOutcomeKind = "word-not-found" | "invalid-word-input" | "invalid-text-input";

export type GeminiErrorKind = GeminiInfrastructureKind | GeminiOutcomeKind;

export type GeminiErrorSurface = "translate" | "tts";

export type GeminiRateLimitDiagnostics = {
  message?: string;
  quotaMetric?: string;
  quotaId?: string;
  quotaModel?: string;
  quotaLocation?: string;
  retryDelay?: string;
};

export type GeminiInfrastructureCause = {
  domain: "infrastructure";
  kind: GeminiInfrastructureKind;
  surface: GeminiErrorSurface;
  model?: string;
  status?: number;
  body?: string;
  rateLimit?: GeminiRateLimitDiagnostics;
};

export type GeminiOutcomeCause = {
  domain: "outcome";
  kind: GeminiOutcomeKind;
  // Locked literal — widen to GeminiErrorSurface if TTS ever gains an outcome kind.
  surface: "translate";
};

export type GeminiErrorCause = GeminiInfrastructureCause | GeminiOutcomeCause;

export type GeminiError = Error & { cause: GeminiErrorCause };

export function geminiError(cause: GeminiErrorCause): GeminiError {
  return new Error(cause.kind, { cause }) as GeminiError;
}

export function isGeminiError(e: unknown): e is GeminiError {
  if (!(e instanceof Error)) return false;
  const c = e.cause;
  if (typeof c !== "object" || c === null) return false;
  return "kind" in c && "surface" in c && "domain" in c;
}

export function isOutcome(err: unknown): err is GeminiError & { cause: GeminiOutcomeCause } {
  return isGeminiError(err) && err.cause.domain === "outcome";
}

/** A failure that may succeed on retry: transport-level (offline) or 5xx/429/408. Outcomes are never transient. */
export function isTransient(err: GeminiError): boolean {
  if (err.cause.domain !== "infrastructure") return false;
  if (err.cause.kind === "network-offline") return true;
  if (err.cause.kind !== "request-failed") return false;
  const status = err.cause.status;
  return typeof status === "number" && (status >= 500 || status === 429 || status === 408);
}

/**
 * Flatten a GeminiError (or any unknown failure) into structured log fields.
 * Lives here — alongside GeminiRateLimitDiagnostics — so the projection cannot
 * drift between translate and TTS call sites.
 */
export function geminiErrorLogFields(err: unknown): Record<string, unknown> {
  if (!isGeminiError(err)) {
    return { error: err instanceof Error ? err.name : "unknown" };
  }
  const cause = err.cause;
  const rateLimit = cause.domain === "infrastructure" ? cause.rateLimit : undefined;
  return {
    error: cause.kind,
    domain: cause.domain,
    status: cause.domain === "infrastructure" ? cause.status : undefined,
    quotaMetric: rateLimit?.quotaMetric,
    quotaId: rateLimit?.quotaId,
    quotaModel: rateLimit?.quotaModel,
    quotaLocation: rateLimit?.quotaLocation,
    retryDelay: rateLimit?.retryDelay,
    message: rateLimit?.message,
  };
}
