export const PROTOCOL_VERSION = "2025-11-25";
export const REQUEST_TIMEOUT_MS = 30_000;
export const UNREACHABLE = "Could not reach SocialFaktory. Check your connection and try again.";
export const TOO_SLOW = "SocialFaktory took too long to answer.";

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

type JsonRpcMessage = {
  jsonrpc: "2.0";
  id?: number | string | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

type ToolResult = {
  isError?: boolean;
  structuredContent?: Record<string, unknown>;
  content?: { type: string; text?: string }[];
};

export type CallOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  resendAfterSignIn?: boolean;
};

export type McpClientOptions = {
  url: string;
  token: string;
  clientName: string;
  clientVersion: string;
  fetch?: Fetch;
  timeoutMs?: number;
};

export class McpUnauthorizedError extends Error {
  constructor() {
    super("SocialFaktory did not accept the credentials");
    this.name = "McpUnauthorizedError";
  }
}

export class McpHttpError extends Error {
  status: number;
  retryAfter: number | undefined;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = "McpHttpError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

export class McpNetworkError extends Error {
  timedOut: boolean;
  unsent: boolean;

  constructor(message: string, timedOut = false, unsent = false) {
    super(message);
    this.name = "McpNetworkError";
    this.timedOut = timedOut;
    this.unsent = unsent;
  }
}

export class McpRpcError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.name = "McpRpcError";
    this.code = code;
  }
}

export class McpToolError extends Error {
  kind: string;
  details: Record<string, unknown>;

  constructor(kind: string, details: Record<string, unknown>) {
    super(describeRefusal(kind, details));
    this.name = "McpToolError";
    this.kind = kind;
    this.details = details;
  }
}

export class McpClient {
  private readonly options: McpClientOptions;
  private readonly fetch: Fetch;
  private sessionId: string | undefined;
  private protocolVersion: string | undefined;
  private ready: Promise<void> | undefined;
  private nextId = 1;

  constructor(options: McpClientOptions) {
    this.options = options;
    this.fetch = options.fetch ?? ((input, init) => fetch(input, init));
  }

  async callTool<T>(name: string, args: Record<string, unknown> = {}, options: CallOptions = {}): Promise<T> {
    try {
      await this.initialize();
    } catch (error) {
      if (error instanceof McpNetworkError) throw new McpNetworkError(error.message, error.timedOut, true);
      throw error;
    }
    try {
      return parseToolResult<T>(await this.request("tools/call", { name, arguments: args }, options));
    } catch (error) {
      if (!(error instanceof McpHttpError && error.status === 404 && this.sessionId)) throw error;
      this.reset();
      await this.initialize();
      return parseToolResult<T>(await this.request("tools/call", { name, arguments: args }, options));
    }
  }

  private initialize(): Promise<void> {
    this.ready ??= this.handshake().catch((error) => {
      this.reset();
      throw error;
    });
    return this.ready;
  }

  private async handshake() {
    const result = (await this.request("initialize", {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: this.options.clientName, version: this.options.clientVersion },
    })) as { protocolVersion?: string } | undefined;
    this.protocolVersion = result?.protocolVersion ?? PROTOCOL_VERSION;
    await this.post({ jsonrpc: "2.0", method: "notifications/initialized" });
  }

  private reset() {
    this.ready = undefined;
    this.sessionId = undefined;
    this.protocolVersion = undefined;
  }

  private async request(method: string, params: Record<string, unknown>, options: CallOptions = {}): Promise<unknown> {
    const id = this.nextId++;
    const { text, contentType } = await this.post({ jsonrpc: "2.0", id, method, params }, options);
    const message = readMessage(text, contentType, id);
    if (message.error) throw new McpRpcError(message.error.code, message.error.message);
    return message.result;
  }

  private async post(
    body: Record<string, unknown>,
    options: CallOptions = {},
  ): Promise<{ text: string; contentType: string }> {
    const { signal } = options;
    const headers: Record<string, string> = {
      Accept: "application/json, text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.options.token}`,
    };
    if (this.protocolVersion) headers["MCP-Protocol-Version"] = this.protocolVersion;
    if (this.sessionId) headers["Mcp-Session-Id"] = this.sessionId;

    const timeout = AbortSignal.timeout(options.timeoutMs ?? this.options.timeoutMs ?? REQUEST_TIMEOUT_MS);
    let response: Response;
    let text: string;
    try {
      response = await this.fetch(this.options.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
      text = await response.text();
    } catch (error) {
      if (signal?.aborted) throw error;
      if (timeout.aborted) throw new McpNetworkError(TOO_SLOW, true);
      throw new McpNetworkError(UNREACHABLE);
    }
    if (response.status === 401) throw new McpUnauthorizedError();

    const retryAfter = parseRetryAfter(response.headers.get("retry-after"));
    if (response.status === 429) throw new McpHttpError(429, tooManyRequests(retryAfter), retryAfter);

    const sessionId = response.headers.get("mcp-session-id");
    if (sessionId) this.sessionId = sessionId;

    if (!response.ok) {
      if (response.status >= 500) {
        throw new McpHttpError(
          response.status,
          `SocialFaktory is having trouble (${response.status}). Try again in a moment.`,
          retryAfter,
        );
      }
      const error = rpcErrorIn(text);
      if (error && response.status !== 404) throw new McpRpcError(error.code, error.message);
      throw new McpHttpError(response.status, error?.message ?? `SocialFaktory answered ${response.status}`);
    }
    return { text, contentType: response.headers.get("content-type") ?? "" };
  }
}

export function readMessage(text: string, contentType: string, id: number): JsonRpcMessage {
  const messages = contentType.includes("text/event-stream") ? parseEventStream(text) : parseJson(text);
  const message = messages.find((candidate) => candidate?.id === id);
  if (!message) throw new Error("SocialFaktory sent no answer to the request");
  return message;
}

function parseJson(text: string): JsonRpcMessage[] {
  try {
    return [JSON.parse(text) as JsonRpcMessage];
  } catch {
    return [];
  }
}

function parseRetryAfter(value: string | null): number | undefined {
  const seconds = Number.parseInt(value ?? "", 10);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : undefined;
}

function tooManyRequests(seconds: number | undefined): string {
  if (seconds === undefined) return "Too many requests. Try again in a minute.";
  if (seconds < 90) return `Too many requests. Try again in ${seconds} seconds.`;
  return `Too many requests. Try again in ${Math.ceil(seconds / 60)} minutes.`;
}

export function isTransient(error: unknown): boolean {
  if (error instanceof McpNetworkError) return true;
  return error instanceof McpHttpError && (error.status === 429 || error.status >= 500);
}

export function retryAfterMs(error: unknown): number | undefined {
  if (!(error instanceof McpHttpError) || error.retryAfter === undefined) return undefined;
  return error.retryAfter * 1000;
}

export function parseEventStream(text: string): JsonRpcMessage[] {
  return text
    .split(/\r?\n\r?\n/)
    .map((event) =>
      event
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n"),
    )
    .filter((data) => data.length > 0)
    .map((data) => JSON.parse(data));
}

export function parseToolResult<T>(result: unknown): T {
  const tool = (result ?? {}) as ToolResult;
  const text = tool.content?.find((item) => item.type === "text")?.text;

  if (tool.isError) {
    const { kind, ...details } = tool.structuredContent ?? {};
    throw new McpToolError(typeof kind === "string" ? kind : (text ?? "unknown_error"), details);
  }
  if (tool.structuredContent) return tool.structuredContent as T;
  if (text === undefined) throw new Error("SocialFaktory sent an empty answer");
  return JSON.parse(text) as T;
}

function rpcErrorIn(text: string): JsonRpcMessage["error"] {
  const error = parseJson(text)[0]?.error as unknown;
  if (typeof error !== "object" || error === null) return undefined;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code !== "number") return undefined;
  return { code, message: typeof message === "string" ? message : `SocialFaktory refused the request (${code})` };
}

const VALIDATION_MESSAGES: Record<string, string> = {
  source_required: "Write a brief first.",
  brand_id_required: "Pick a brand first.",
  no_connected_channels: "Connect a social channel to this brand in SocialFaktory first.",
  unreachable_source: "SocialFaktory could not read that source.",
  source_not_ready: "That source is not ready yet. Try again in a moment.",
};

function validationMessage(details: Record<string, unknown>): string {
  const code = typeof details.code === "string" ? details.code : undefined;
  if (code && VALIDATION_MESSAGES[code]) return VALIDATION_MESSAGES[code];
  if (typeof details.message !== "string") return `SocialFaktory refused the request (${code ?? "validation_failed"}).`;
  if (/^Substance\b/.test(details.message)) return VALIDATION_MESSAGES.source_required;
  return details.message;
}

export function describeRefusal(kind: string, details: Record<string, unknown>): string {
  switch (kind) {
    case "insufficient_tokens":
      return `Not enough credits: ${details.balance ?? 0} available, ${details.required ?? "more"} needed.`;
    case "credit_cap_exceeded":
      return `This connection reached its monthly credit cap (${details.spent ?? "?"} of ${details.cap ?? "?"} credits).`;
    case "subscription_required":
      return "This needs an active SocialFaktory plan.";
    case "scope_required":
      return `This connection was not granted the ${details.scope ?? "required"} permission. Use Sign in Again in a SocialFaktory command and allow it on the consent screen, or use an API token with that scope.`;
    case "brand_not_allowed":
      return "This connection may not act for that brand.";
    case "not_found":
      return "SocialFaktory could not find that item.";
    case "reconnect_required":
      return "The social channel needs to be reconnected in SocialFaktory.";
    case "platform_unavailable":
      return "The social platform is not reachable right now. Try again later.";
    case "validation_failed":
      return validationMessage(details);
    case "idempotency_in_progress":
      return "SocialFaktory is still working on this request. Try again in a moment.";
    case "tool_failed":
      return "SocialFaktory could not finish this request. Try again in a moment.";
    default:
      return `SocialFaktory refused the request (${kind}).`;
  }
}
