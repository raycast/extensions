export type ProviderErrorKind = "auth" | "rate_limit" | "network" | "schema" | "unknown";

export type ErrorSource = "stripe" | "lemonsqueezy" | "gumroad" | "paddle" | "fx" | "license";

/**
 * Every failure that crosses a provider boundary is a ProviderError. The message is always redacted, so it is safe to
 * show in a toast, an error row or a log line.
 */
export class ProviderError extends Error {
  readonly provider: ErrorSource;
  readonly kind: ProviderErrorKind;
  readonly status?: number;

  constructor(provider: ErrorSource, kind: ProviderErrorKind, message: string, options?: { status?: number }) {
    super(redact(message));
    this.name = "ProviderError";
    this.provider = provider;
    this.kind = kind;
    this.status = options?.status;
  }
}

/** Plain, JSON-safe shape of an error. Used in cached hook results, where Error instances do not survive. */
export type SerializedError = { provider?: ErrorSource; kind: ProviderErrorKind; message: string; status?: number };

export function serializeError(error: unknown): SerializedError {
  if (error instanceof ProviderError) {
    return { provider: error.provider, kind: error.kind, message: error.message, status: error.status };
  }
  if (error instanceof Error) {
    return { kind: "unknown", message: redact(error.message) };
  }
  return { kind: "unknown", message: redact(String(error)) };
}

const SECRET_PATTERNS: RegExp[] = [
  // Stripe secret, restricted and publishable keys.
  /\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/g,
  // Paddle Billing API keys.
  /\bpdl_(?:live|sdbx)_apikey_[A-Za-z0-9_]+/g,
  // Authorization header values.
  /\bBearer\s+[A-Za-z0-9._~+/=-]+/gi,
  // access_token / license_key query or form values.
  /\b(access_token|license_key|api_key|token)=([^&\s]+)/gi,
  // JWTs (Lemon Squeezy API keys are JWTs).
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  // UUID-shaped license keys.
  /\b[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}\b/g,
];

const knownSecrets = new Set<string>();

/** Register a secret value (an API key from preferences) so it is scrubbed from every message, whatever its shape. */
export function registerSecret(secret: string | undefined): void {
  const trimmed = secret?.trim();
  if (trimmed && trimmed.length >= 6) {
    knownSecrets.add(trimmed);
  }
}

export function redact(message: string): string {
  let result = message;
  for (const secret of knownSecrets) {
    result = result.split(secret).join("[redacted]");
  }
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match, name?: string) =>
      typeof name === "string" && match.includes("=") ? `${name}=[redacted]` : "[redacted]",
    );
  }
  return result;
}

const KIND_TITLES: Record<ProviderErrorKind, string> = {
  auth: "Invalid or missing permissions on the API key",
  rate_limit: "Rate limited, try again in a minute",
  network: "Network error",
  schema: "Unexpected response from the API",
  unknown: "Request failed",
};

export function describeErrorKind(kind: ProviderErrorKind): string {
  return KIND_TITLES[kind];
}
