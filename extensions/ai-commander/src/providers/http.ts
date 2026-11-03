import { maskSecrets, ProviderError } from "../core/errors";
import { isRecord } from "../core/guards";
import type { ProviderId } from "../core/types";
import { PROVIDER_LABELS } from "./profiles";

/** Silence limit, not a total limit: long reasoning runs must not be cut off. */
export const IDLE_TIMEOUT_MS = 120_000;

const DETAIL_MAX_LENGTH = 200;
const ECHO_WINDOW_WORDS = 4;

/** Facts about the request that change how a failure reads. */
export interface ErrorContext {
  /** Request-side OpenRouter limits are active (`zdr`, `data_collection`, `ignore`). */
  restricted?: boolean;
  /** Text that must never reach an error message, normally the prompt and the user's input. */
  sensitive?: readonly string[];
}

export interface ProviderRequest {
  provider: ProviderId;
  url: string;
  headers: Record<string, string>;
  /** Sent as JSON. Its absence makes the request a GET. */
  body?: unknown;
  signal?: AbortSignal;
  context?: ErrorContext;
  idleTimeoutMs?: number;
}

export function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

/** Normalized view of the error bodies below, whichever provider sent them. */
interface RawError {
  status?: number;
  code?: string;
  message: string;
  flagged: boolean;
}

/** Maps error names to HTTP semantics, because errors inside a stream arrive under status 200. */
const ERROR_NAME_STATUS: Readonly<Record<string, number>> = {
  // platform.claude.com/docs/en/api/errors, checked 2026-11-02.
  invalid_request_error: 400,
  authentication_error: 401,
  billing_error: 402,
  permission_error: 403,
  not_found_error: 404,
  request_too_large: 413,
  rate_limit_error: 429,
  api_error: 500,
  timeout_error: 504,
  overloaded_error: 529,
  // OpenAI style names. The docs define no general mid-stream error event, so this is defensive.
  rate_limit_exceeded: 429,
  insufficient_quota: 429,
  server_error: 500,
  // Google RPC status names.
  INVALID_ARGUMENT: 400,
  UNAUTHENTICATED: 401,
  PERMISSION_DENIED: 403,
  NOT_FOUND: 404,
  RESOURCE_EXHAUSTED: 429,
  INTERNAL: 500,
  UNAVAILABLE: 503,
  DEADLINE_EXCEEDED: 504,
};

/**
 * Accepts all shapes in use on 2026-11-02:
 * - OpenAI: `{ error: { message, type, param, code } }`
 * - Anthropic: `{ type: "error", error: { type, message } }`
 * - OpenRouter: `{ error: { code: number, message, metadata } }`, also as a chunk field inside a stream
 * - Gemini: the same as OpenAI, or that object wrapped in a one-element array (known from client libraries, not in the docs)
 */
function readRawError(payload: unknown): RawError {
  const root: unknown = Array.isArray(payload) ? payload[0] : payload;
  const outer = isRecord(root) ? root : {};
  const error = isRecord(outer.error) ? outer.error : outer;
  const names = [error.code, error.type, error.status].filter((name) => typeof name === "string");
  const named = names.map((name) => ERROR_NAME_STATUS[name]).find((status) => status !== undefined);
  const metadata = isRecord(error.metadata) ? error.metadata : {};
  return {
    status: optionalNumber(error.code) ?? named,
    code: names[0],
    message: optionalString(error.message) ?? "",
    // Only the presence is read: `metadata.flagged_input` holds a fragment of the user's text.
    flagged: Array.isArray(metadata.reasons),
  };
}

/** True if a run of words from `detail` also occurs in a protected text, meaning the provider quoted it. */
function echoesSensitiveText(detail: string, sensitive: readonly string[]): boolean {
  // Punctuation is stripped because providers wrap quoted input in quotes, which would hide the match.
  const words = detail
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((word) => word !== "");
  return sensitive.some((text) => {
    if (text === "") return false;
    if (detail.includes(text)) return true;
    for (let i = 0; i + ECHO_WINDOW_WORDS <= words.length; i++) {
      if (text.includes(words.slice(i, i + ECHO_WINDOW_WORDS).join(" "))) return true;
    }
    return false;
  });
}

/** The provider's explanation, if it is safe to show. Runs only on the failure path, so its cost does not matter. */
function safeDetail(message: string, context: ErrorContext): string | undefined {
  const detail = maskSecrets(message.trim());
  if (detail === "" || echoesSensitiveText(detail, context.sensitive ?? [])) return undefined;
  return detail.length > DETAIL_MAX_LENGTH ? `${detail.slice(0, DETAIL_MAX_LENGTH)}…` : detail;
}

function withDetail(summary: string, detail: string | undefined): string {
  return detail === undefined ? summary : `${summary}: ${detail}`;
}

/**
 * OpenRouter gives this failure no stable code. Wording seen in public reports, as of 2026-11-02:
 * "No endpoints found matching your data policy (Zero data retention)", "0 endpoints out of 3 requested are available
 * matching your guardrail restrictions and data policy", and 503 "no available provider meets the routing
 * requirements" (openrouter.ai/docs/api-reference/errors). The docs show no message text, so this matches loosely.
 */
const POLICY_FAILURE = /data policy|guardrail|no allowed providers/i;
const NO_ENDPOINT = /no endpoints?\b|no (allowed |available )?providers?\b/i;
/** Filtered out by parameter support rather than by privacy, e.g. "No endpoints found that support …". */
const PARAMETER_ROUTING_FAILURE = /endpoints? found that (support|can handle)/i;
const UNKNOWN_MODEL =
  /model_not_found|not a valid model|unknown model|invalid model|model .*(does not exist|not found)/i;

function classify(provider: ProviderId, status: number | undefined, raw: RawError, context: ErrorContext) {
  const label = PROVIDER_LABELS[provider];
  const detail = safeDetail(raw.message, context);
  const fail = (kind: ConstructorParameters<typeof ProviderError>[0], message: string) =>
    new ProviderError(kind, maskSecrets(message), provider, status);
  const text = `${raw.code ?? ""} ${raw.message}`;

  if (status === undefined) return fail("unknown", withDetail(`${label} reported an error`, detail));

  if (provider === "openrouter") {
    if (PARAMETER_ROUTING_FAILURE.test(text)) {
      return fail("invalid-parameter", withDetail("No provider accepts these settings for this model", detail));
    }
    if (POLICY_FAILURE.test(text) || (context.restricted === true && NO_ENDPOINT.test(text))) {
      return fail("no-strict-endpoint", "Choose another model, or change the privacy mode in Models & Providers.");
    }
    if (status === 403 && raw.flagged) {
      return fail("refusal", "OpenRouter's moderation blocked this request. Try a different model.");
    }
  }

  if (status === 401 || status === 403) {
    return fail("auth", `${label} rejected the key. Check it in the extension preferences.`);
  }
  // Gemini reports a bad key as 400 INVALID_ARGUMENT (known from client libraries, not in the docs).
  if (status === 400 && /api[ _]key/i.test(text)) {
    return fail("auth", `${label} rejected the key. Check it in the extension preferences.`);
  }
  if (status === 404 || (status === 400 && UNKNOWN_MODEL.test(text))) {
    return fail("model-not-found", `${label} does not offer this model. Choose another one.`);
  }
  if (status === 402 || raw.code === "insufficient_quota") {
    return fail("out-of-credits", `Your ${label} account has no credits left. Top it up or choose another model.`);
  }
  if (status === 429) return fail("rate-limit", `${label} is limiting requests. Try again later.`);
  if (status === 408) return fail("timeout", `${label} timed out. Try again.`);
  if (status >= 500) return fail("provider-down", `${label} is having problems. Try again later.`);
  if (status === 413) return fail("invalid-parameter", "The text is too long for this model.");
  if (status === 400 || status === 422) {
    return fail("invalid-parameter", withDetail(`${label} rejected the request`, detail));
  }
  return fail("unknown", withDetail(`${label} returned status ${status}`, detail));
}

/** Maps a non-OK HTTP response. `bodyText` is the raw response body and may be anything, e.g. a proxy's HTML page. */
export function errorFromStatus(
  provider: ProviderId,
  status: number,
  bodyText: string,
  context: ErrorContext = {},
): ProviderError {
  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    payload = undefined;
  }
  return classify(provider, status, readRawError(payload), context);
}

/** Maps an error delivered inside a 200 response, as an SSE event or as a JSON body. */
export function errorFromPayload(provider: ProviderId, payload: unknown, context: ErrorContext = {}): ProviderError {
  const raw = readRawError(payload);
  return classify(provider, raw.status, raw, context);
}

/** Parses one SSE payload. Broken JSON is an error: skipping it would silently drop text from the result. */
export function parseEventData(provider: ProviderId, data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    throw new ProviderError("unknown", `${PROVIDER_LABELS[provider]} sent an unreadable response.`, provider);
  }
}

/** The stream ended without a finish signal, so the text may be incomplete and must not be used as a result. */
export function truncatedStreamError(provider: ProviderId): ProviderError {
  return new ProviderError(
    "network",
    `The connection to ${PROVIDER_LABELS[provider]} ended before the response was complete.`,
    provider,
  );
}

/** Links the caller's signal with the idle timer and tells the two kinds of abort apart afterwards. */
class RequestGuard {
  readonly controller = new AbortController();
  private timedOut = false;
  private readonly timer: NodeJS.Timeout;
  private readonly onParentAbort = () => this.controller.abort();

  constructor(
    private readonly provider: ProviderId,
    private readonly parent: AbortSignal | undefined,
    idleTimeoutMs: number,
  ) {
    parent?.addEventListener("abort", this.onParentAbort, { once: true });
    this.timer = setTimeout(() => {
      this.timedOut = true;
      this.controller.abort();
    }, idleTimeoutMs);
  }

  /** `refresh` reuses the timer, so a stream of thousands of small chunks does not churn through timers. */
  touch(): void {
    this.timer.refresh();
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.parent?.removeEventListener("abort", this.onParentAbort);
  }

  /** Never passes on the underlying message: it can contain the URL, and it is not written for users. */
  translate(error: unknown): ProviderError {
    if (error instanceof ProviderError) return error;
    const label = PROVIDER_LABELS[this.provider];
    if (this.parent?.aborted === true) return new ProviderError("aborted", "Request canceled.", this.provider);
    if (this.timedOut) {
      return new ProviderError("timeout", `${label} sent no data for two minutes. Try again.`, this.provider);
    }
    return new ProviderError("network", `Could not reach ${label}. Check your connection.`, this.provider);
  }
}

async function send(request: ProviderRequest, guard: RequestGuard): Promise<Response> {
  if (request.signal?.aborted === true) guard.controller.abort();
  guard.controller.signal.throwIfAborted();
  const hasBody = request.body !== undefined;
  const response = await fetch(request.url, {
    method: hasBody ? "POST" : "GET",
    headers: hasBody ? { "content-type": "application/json", ...request.headers } : request.headers,
    ...(hasBody ? { body: JSON.stringify(request.body) } : {}),
    // fetch keeps `x-api-key`, `x-goog-api-key` and the body on a cross-origin redirect and only drops `authorization`.
    // No provider endpoint needs a redirect, so one is treated as a failure instead of sending key and text elsewhere.
    redirect: "error",
    signal: guard.controller.signal,
  });
  if (!response.ok) {
    throw errorFromStatus(request.provider, response.status, await response.text(), request.context);
  }
  return response;
}

/** Fetches and parses a JSON response. The idle limit bounds the whole exchange, which is short anyway. */
export async function fetchJson(request: ProviderRequest): Promise<unknown> {
  const guard = new RequestGuard(request.provider, request.signal, request.idleTimeoutMs ?? IDLE_TIMEOUT_MS);
  try {
    const response = await send(request, guard);
    return parseEventData(request.provider, await response.text());
  } catch (error) {
    throw guard.translate(error);
  } finally {
    guard.dispose();
  }
}

/**
 * Streams the response body. Any bytes count as activity, so SSE comments and pings keep a silent reasoning phase
 * alive. Leaving the loop early cancels the connection, which also stops billing where the provider supports it.
 */
export async function* fetchStream(request: ProviderRequest): AsyncGenerator<Uint8Array> {
  const guard = new RequestGuard(request.provider, request.signal, request.idleTimeoutMs ?? IDLE_TIMEOUT_MS);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  try {
    const response = await send(request, guard);
    // OpenRouter can answer 200 with a plain JSON error (openrouter.ai/docs/api-reference/errors, 2026-11-02).
    if (response.headers.get("content-type")?.includes("application/json") === true) {
      const payload = parseEventData(request.provider, await response.text());
      throw errorFromPayload(request.provider, payload, request.context);
    }
    if (response.body === null) throw truncatedStreamError(request.provider);

    reader = response.body.getReader();
    for (;;) {
      // Refreshed here rather than after the read, so time spent by the consumer is not counted as silence.
      guard.touch();
      const { done, value } = await reader.read();
      if (done) return;
      yield value;
    }
  } catch (error) {
    throw guard.translate(error);
  } finally {
    guard.dispose();
    await reader?.cancel().catch(() => undefined);
  }
}
