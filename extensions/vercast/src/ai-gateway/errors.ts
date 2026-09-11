export type AIGatewayErrorKind =
  | "authentication"
  | "rate_limit"
  | "malformed_response"
  | "network"
  | "unsupported_model"
  | "not_found"
  | "insufficient_permissions"
  | "insufficient_credits"
  | "invalid_request"
  | "provider_error"
  | "unavailable";

export type AIGatewayOperation = "catalog" | "model_endpoints" | "leaderboard" | "chat_completion";

export class AIGatewayError extends Error {
  readonly kind: AIGatewayErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly operation: AIGatewayOperation;

  constructor(options: {
    kind: AIGatewayErrorKind;
    message: string;
    operation: AIGatewayOperation;
    status?: number;
    code?: string;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AIGatewayError";
    this.kind = options.kind;
    this.operation = options.operation;
    this.status = options.status;
    this.code = options.code;
  }
}

interface ApiErrorHint {
  code?: string;
  message?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeCode(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_.-]{1,80}$/.test(value)) {
    return undefined;
  }
  return value;
}

export function readApiErrorHint(value: unknown): ApiErrorHint {
  if (!isRecord(value)) {
    return {};
  }

  const nested = isRecord(value.error) ? value.error : value;
  return {
    code: safeCode(nested.code) ?? safeCode(nested.type),
    message: typeof nested.message === "string" ? nested.message.slice(0, 500) : undefined,
  };
}

function mentionsModel(errorHint: ApiErrorHint): boolean {
  const text = `${errorHint.code ?? ""} ${errorHint.message ?? ""}`.toLowerCase().replaceAll(/[_-]/g, " ");
  return (
    text.includes("model") && (text.includes("unsupported") || text.includes("not found") || text.includes("unknown"))
  );
}

function mentionsCredits(errorHint: ApiErrorHint): boolean {
  const text = `${errorHint.code ?? ""} ${errorHint.message ?? ""}`.toLowerCase().replaceAll(/[_-]/g, " ");
  return text.includes("credit") || text.includes("fund") || text.includes("balance");
}

export function createHttpError(
  status: number,
  operation: AIGatewayOperation,
  errorHint: ApiErrorHint = {},
): AIGatewayError {
  const shared = { operation, status, code: errorHint.code };

  if (status === 401) {
    return new AIGatewayError({
      ...shared,
      kind: "authentication",
      message: "AI Gateway authentication failed. Check the API key.",
    });
  }
  if (status === 402) {
    return new AIGatewayError({
      ...shared,
      kind: "insufficient_credits",
      message: "The AI Gateway account has insufficient credits.",
    });
  }
  if (status === 403) {
    if (mentionsCredits(errorHint)) {
      return new AIGatewayError({
        ...shared,
        kind: "insufficient_credits",
        message: "The AI Gateway account has insufficient credits.",
      });
    }
    return new AIGatewayError({
      ...shared,
      kind: "insufficient_permissions",
      message: "The API key does not have permission for this request.",
    });
  }
  if (status === 404) {
    const unsupportedModel = operation === "model_endpoints" || operation === "chat_completion";
    return new AIGatewayError({
      ...shared,
      kind: unsupportedModel ? "unsupported_model" : "not_found",
      message: unsupportedModel
        ? "The requested model is not supported or was not found."
        : "The requested resource was not found.",
    });
  }
  if (status === 429) {
    return new AIGatewayError({
      ...shared,
      kind: "rate_limit",
      message: "AI Gateway rate limit exceeded. Try again later.",
    });
  }
  if (status === 400 && mentionsModel(errorHint)) {
    return new AIGatewayError({
      ...shared,
      kind: "unsupported_model",
      message: "The requested model is not supported or was not found.",
    });
  }
  if (status === 424) {
    return new AIGatewayError({
      ...shared,
      kind: "provider_error",
      message: "The selected AI provider failed to complete the request.",
    });
  }
  if (status >= 400 && status < 500) {
    return new AIGatewayError({
      ...shared,
      kind: "invalid_request",
      message: `AI Gateway rejected the request (${status}).`,
    });
  }
  if (status === 503 || status === 504) {
    return new AIGatewayError({
      ...shared,
      kind: "unavailable",
      message: "AI Gateway or the selected provider is temporarily unavailable.",
    });
  }
  if (status >= 500) {
    return new AIGatewayError({
      ...shared,
      kind: "provider_error",
      message: "The AI provider failed to complete the request.",
    });
  }

  return new AIGatewayError({
    ...shared,
    kind: "unavailable",
    message: `AI Gateway request failed (${status}).`,
  });
}

export function createNetworkError(operation: AIGatewayOperation, cause: unknown): AIGatewayError {
  return new AIGatewayError({
    kind: "network",
    operation,
    message: "Could not reach AI Gateway. Check the network connection and try again.",
    cause,
  });
}

export function createMalformedResponseError(
  operation: AIGatewayOperation,
  detail: string,
  cause?: unknown,
): AIGatewayError {
  return new AIGatewayError({
    kind: "malformed_response",
    operation,
    message: `AI Gateway returned a malformed response: ${detail}.`,
    cause,
  });
}
