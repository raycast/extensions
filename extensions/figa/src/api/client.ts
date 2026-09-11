import { getFigaPreferences } from "./preferences";
import type {
  FigaCategoryListResponse,
  FigaExpenseCreatePayload,
  FigaExpenseCreateResponse,
  FigaExpensePaymentListResponse,
  FigaExpensePaymentPayload,
  FigaExpensePaymentResponse,
  FigaExpenseListQuery,
  FigaExpenseListResponse,
  FigaApiFailure,
  FigaApiResponse,
  FigaFriendlyError,
  FigaMonthlyTotalsQuery,
  FigaMonthlyTotalsResponse,
  FigaRecipientListResponse,
  FigaWorkspaceContext,
} from "./types";

const USER_AGENT = "FigaRaycast/0.1.0 (Raycast)";
const FIGA_API_BASE_URL = "https://api.figa.cc";

interface FigaRequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  idempotencyKey?: string;
}

interface FriendlyErrorRule {
  matches: (status: number, code: string | null) => boolean;
  friendly: FigaFriendlyError | ((message: string) => FigaFriendlyError);
}

type QueryValue = string | number | boolean | undefined;

const FRIENDLY_ERROR_RULES: FriendlyErrorRule[] = [
  {
    matches: (status, code) => status === 401 || code === "UNAUTHORIZED",
    friendly: {
      kind: "invalid-api-key",
      title: "Invalid API key",
      message: "The configured Figa API key is invalid or expired.",
      action: "Create a new workspace API key and update extension preferences.",
    },
  },
  {
    matches: (_status, code) => code === "FEATURE_NOT_AVAILABLE",
    friendly: {
      kind: "paid-plan-required",
      title: "Paid plan required",
      message:
        "API keys require a paid Figa plan. This key may have stopped working after the workspace was downgraded.",
      action: "Upgrade the workspace or use a key from a Pro or Enterprise workspace.",
    },
  },
  {
    matches: (_status, code) => code === "INSUFFICIENT_PERMISSIONS",
    friendly: {
      kind: "insufficient-permissions",
      title: "API key lacks permissions",
      message: "This command needs a key with the required Figa permission preset.",
      action: "Use a read key for read commands or a write key for mutation commands.",
    },
  },
  {
    matches: (status, code) => status === 403 || code === "FORBIDDEN",
    friendly: {
      kind: "forbidden",
      title: "Request not allowed",
      message: "The configured key cannot call this Figa endpoint.",
      action: "Check the command scope and API route allowlist.",
    },
  },
  {
    matches: (status, code) => status === 429 || code === "RATE_LIMITED",
    friendly: {
      kind: "rate-limited",
      title: "Rate limited",
      message: "Figa is rate limiting this API key.",
      action: "Wait a moment and try again.",
    },
  },
  {
    matches: (status, code) => status === 400 || code === "VALIDATION_ERROR" || code === "INVALID_INPUT",
    friendly: (message) => ({
      kind: "validation-error",
      title: "Request not accepted",
      message,
      action: "Check the command input and try again.",
    }),
  },
];

class FigaApiError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details: unknown;
  readonly friendly: FigaFriendlyError;

  constructor(input: {
    message: string;
    status: number | null;
    code?: string | null;
    details?: unknown;
    friendly: FigaFriendlyError;
  }) {
    super(input.message);
    this.name = "FigaApiError";
    this.status = input.status;
    this.code = input.code ?? null;
    this.details = input.details;
    this.friendly = input.friendly;
  }
}

export function getWorkspaceContext(): Promise<FigaWorkspaceContext> {
  return requestFiga<FigaWorkspaceContext>("/api/v1/context");
}

export function getCategories(): Promise<FigaCategoryListResponse> {
  return requestFiga<FigaCategoryListResponse>("/api/v1/categories");
}

export function getRecipients(): Promise<FigaRecipientListResponse> {
  return requestFiga<FigaRecipientListResponse>("/api/v1/recipients");
}

export function getExpenses(query: FigaExpenseListQuery): Promise<FigaExpenseListResponse> {
  return requestFiga<FigaExpenseListResponse>(withQuery("/api/v1/expenses", query));
}

export function createExpense(
  payload: FigaExpenseCreatePayload,
  idempotencyKey: string,
): Promise<FigaExpenseCreateResponse> {
  return requestFiga<FigaExpenseCreateResponse>("/api/v1/expenses", {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
}

export function getExpensePayments(expenseId: string): Promise<FigaExpensePaymentListResponse> {
  return requestFiga<FigaExpensePaymentListResponse>(`/api/v1/expenses/${encodeURIComponent(expenseId)}/payments`);
}

export function recordExpensePayment(
  expenseId: string,
  payload: FigaExpensePaymentPayload,
  idempotencyKey: string,
): Promise<FigaExpensePaymentResponse> {
  return requestFiga<FigaExpensePaymentResponse>(`/api/v1/expenses/${encodeURIComponent(expenseId)}/payments`, {
    method: "POST",
    body: payload,
    idempotencyKey,
  });
}

export function getMonthlyTotals(query: FigaMonthlyTotalsQuery): Promise<FigaMonthlyTotalsResponse> {
  return requestFiga<FigaMonthlyTotalsResponse>(withQuery("/api/v1/expenses/monthly-totals", query));
}

async function requestFiga<T>(path: string, options: FigaRequestOptions = {}): Promise<T> {
  const preferences = getFigaPreferences();
  assertUsablePreferences(preferences);

  const url = buildApiUrl(path);
  const requestInit = buildRequestInit(preferences.apiKey, options);

  let response: Response;
  try {
    response = await fetch(url, requestInit);
  } catch (error) {
    throw createNetworkError(error);
  }

  const payload = await readFigaPayload(response);
  return unwrapFigaResponse<T>(response, payload);
}

function buildRequestInit(apiKey: string, options: FigaRequestOptions): RequestInit {
  const headers = buildHeaders(apiKey, options);
  const body = options.body === undefined ? undefined : JSON.stringify(options.body);

  return {
    method: options.method ?? "GET",
    headers,
    body,
  };
}

function buildHeaders(apiKey: string, options: FigaRequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
    "x-api-key": apiKey,
  };

  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.idempotencyKey) headers["Idempotency-Key"] = options.idempotencyKey;

  return headers;
}

function unwrapFigaResponse<T>(response: Response, payload: unknown): T {
  if (!response.ok) {
    throw createHttpError(response.status, payload);
  }

  if (!isFigaSuccess<T>(payload)) {
    throw createUnexpectedResponseError(response.status, payload);
  }

  return payload.data;
}

export function toFriendlyError(error: unknown): FigaFriendlyError {
  if (error instanceof FigaApiError) {
    return {
      ...error.friendly,
      status: error.status,
      code: error.code,
    };
  }

  return {
    kind: "unexpected-error",
    title: "Unexpected error",
    message: error instanceof Error ? error.message : "Raycast could not complete the request.",
    action: "Try again.",
  };
}

async function readFigaPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  const contentType = response.headers.get("content-type");

  return parsePayloadText(text, contentType);
}

function parsePayloadText(text: string, contentType: string | null): unknown {
  if (!contentType?.includes("application/json")) return text.length > 0 ? text : null;
  return parseJsonText(text);
}

function parseJsonText(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function assertUsablePreferences(preferences: ReturnType<typeof getFigaPreferences>): void {
  if (!preferences.apiKey) throw createMissingApiKeyError();
}

function buildApiUrl(path: string): URL {
  return new URL(path, `${FIGA_API_BASE_URL}/`);
}

function withQuery(path: string, query: object): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query) as Array<[string, QueryValue]>) {
    if (value === undefined) continue;
    params.set(key, String(value));
  }

  const queryString = params.toString();
  return queryString ? `${path}?${queryString}` : path;
}

function createMissingApiKeyError(): FigaApiError {
  return new FigaApiError({
    message: "Missing Figa API key.",
    status: null,
    code: "MISSING_API_KEY",
    friendly: {
      kind: "missing-api-key",
      title: "API key required",
      message: "Add a Figa workspace API key before running this command.",
      action: "Open extension preferences and paste a dedicated read API key.",
    },
  });
}

function createNetworkError(cause: unknown): FigaApiError {
  const message = cause instanceof Error ? cause.message : "Network request failed.";

  return new FigaApiError({
    message,
    status: null,
    friendly: {
      kind: "network-failure",
      title: "Cannot reach Figa",
      message: "Raycast could not connect to Figa. Check your connection and try again.",
      action: "Try again.",
    },
  });
}

function createHttpError(status: number, payload: unknown): FigaApiError {
  const failure = isFigaFailure(payload) ? payload : null;
  const code = getFailureCode(failure);
  const message = getFailureMessage(failure, status);

  return new FigaApiError({
    message,
    status,
    code,
    details: getFailureDetails(failure),
    friendly: createFriendlyError(status, code, message),
  });
}

function getFailureCode(failure: FigaApiFailure | null): string | null {
  return failure?.error?.code ?? null;
}

function getFailureMessage(failure: FigaApiFailure | null, status: number): string {
  return failure?.message ?? `Figa API returned HTTP ${status}.`;
}

function getFailureDetails(failure: FigaApiFailure | null): unknown {
  return failure?.error?.details;
}

function createUnexpectedResponseError(status: number, payload: unknown): FigaApiError {
  return new FigaApiError({
    message: "Figa returned an unexpected response shape.",
    status,
    details: payload,
    friendly: {
      kind: "unexpected-response",
      title: "Unexpected Figa response",
      message: "The API responded, but Raycast could not read the response envelope.",
      action: "Try again. If this keeps happening, contact Figa support.",
    },
  });
}

function createFriendlyError(status: number, code: string | null, message: string): FigaFriendlyError {
  const rule = FRIENDLY_ERROR_RULES.find((candidate) => candidate.matches(status, code));
  if (rule) return resolveFriendlyError(rule, message);

  return {
    kind: "request-failed",
    title: "Figa request failed",
    message,
    action: "Try again.",
  };
}

function resolveFriendlyError(rule: FriendlyErrorRule, message: string): FigaFriendlyError {
  if (typeof rule.friendly === "function") return rule.friendly(message);
  return rule.friendly;
}

function isFigaSuccess<T>(payload: unknown): payload is FigaApiResponse<T> & { success: true } {
  return isRecord(payload) && payload.success === true && "data" in payload;
}

function isFigaFailure(payload: unknown): payload is FigaApiFailure {
  return isRecord(payload) && payload.success === false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
