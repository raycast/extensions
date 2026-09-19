export class TickTickError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(message: string, code: string, retryable: boolean, retryAfterMs?: number, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = "TickTickError";
    this.code = code;
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

export class AuthenticationError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "authentication", false, undefined, cause);
    this.name = "AuthenticationError";
  }
}

export class PermissionError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "permission", false, undefined, cause);
    this.name = "PermissionError";
  }
}

export class RateLimitError extends TickTickError {
  constructor(message: string, retryAfterMs?: number, cause?: unknown) {
    super(message, "rate_limit", true, retryAfterMs, cause);
    this.name = "RateLimitError";
  }
}

export class ValidationError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "validation", false, undefined, cause);
    this.name = "ValidationError";
  }
}

export class NotFoundError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "not_found", false, undefined, cause);
    this.name = "NotFoundError";
  }
}

export class NetworkError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "network", true, undefined, cause);
    this.name = "NetworkError";
  }
}

export class PartialRefreshError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "partial_refresh", true, undefined, cause);
    this.name = "PartialRefreshError";
  }
}

export class ProtocolError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "protocol", false, undefined, cause);
    this.name = "ProtocolError";
  }
}

export class AmbiguousMutationError extends TickTickError {
  constructor(message: string, cause?: unknown) {
    super(message, "ambiguous_mutation", false, undefined, cause);
    this.name = "AmbiguousMutationError";
  }
}

function isCredentialShaped(value: string): boolean {
  const unquoted = value.replace(/^(?:"|')|(?:"|')$/g, "").replace(/[.,!?]+$/g, "");
  return /[0-9._~-]/.test(unquoted);
}

export function sanitizeForError(value: string): string {
  return value
    .replace(/\b(authorization\s*:\s*bearer)\s+[^\s;,]+/gi, "$1 [REDACTED]")
    .replace(/\b(bearer)\s+([^\s;,]+)/gi, (match, scheme: string, credential: string) =>
      isCredentialShaped(credential) ? `${scheme} [REDACTED]` : match
    )
    .replace(
      /\b(access[_-]?token|api[_-]?key|client[_-]?secret|refresh[_-]?token|id[_-]?token|token|key)(\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s;,]+)/gi,
      (match, field: string, separator: string, assignedValue: string) => {
        const isExplicitCredentialField =
          /^(access[_-]?token|api[_-]?key|client[_-]?secret|refresh[_-]?token|id[_-]?token)$/i.test(field);
        return isExplicitCredentialField || isCredentialShaped(assignedValue)
          ? `${field}${separator}[REDACTED]`
          : match;
      }
    );
}
