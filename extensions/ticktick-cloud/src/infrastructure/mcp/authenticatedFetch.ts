import {
  InsufficientScopeError,
  ProtocolError as SdkProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  UnauthorizedError,
} from "@modelcontextprotocol/client";
import {
  AmbiguousMutationError,
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PartialRefreshError,
  PermissionError,
  ProtocolError,
  RateLimitError,
  TickTickError,
  ValidationError,
} from "../../domain/errors";
import type { AuthProvider } from "../auth/AuthProvider";
import type {
  JsonObject,
  McpClientPort,
  McpRequestOptions,
  McpToolCallResult,
  McpToolDefinition,
  McpToolPage,
} from "./McpClientPort";

const MAX_CATALOG_PAGES = 64;
const NETWORK_SDK_ERRORS = new Set<SdkErrorCode>([
  SdkErrorCode.RequestTimeout,
  SdkErrorCode.NotConnected,
  SdkErrorCode.ConnectionClosed,
  SdkErrorCode.SendFailed,
  SdkErrorCode.EraNegotiationFailed,
]);
const HTTP_DATE =
  /^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
const NETWORK_ERROR_CODES =
  /^(?:EAI_AGAIN|ECONNABORTED|ECONNREFUSED|ECONNRESET|EHOSTUNREACH|ENETDOWN|ENETUNREACH|ENOTFOUND|ETIMEDOUT|UND_ERR_(?:CONNECT_)?TIMEOUT|CERT_[A-Z0-9_]+|ERR_TLS_[A-Z0-9_]+)$/;

export interface SdkToolCallResult {
  isError?: boolean;
  content: unknown;
  structuredContent?: unknown;
}

export interface McpSdkClientPort {
  connect(options?: McpRequestOptions): Promise<void>;
  listToolsPage(cursor?: string, options?: McpRequestOptions): Promise<McpToolPage>;
  callTool(
    name: string,
    arguments_: JsonObject,
    definition?: McpToolDefinition,
    options?: McpRequestOptions
  ): Promise<SdkToolCallResult>;
  close(): Promise<void>;
}

class AuthenticatedMcpClient implements McpClientPort {
  private closePromise: Promise<void> | undefined;
  private invalidationPromise: Promise<void> | undefined;
  private definitions = new Map<string, McpToolDefinition[]>();

  constructor(private readonly auth: AuthProvider, private readonly sdk: McpSdkClientPort) {}

  async connect(options?: McpRequestOptions): Promise<void> {
    try {
      await this.sdk.connect(options);
    } catch (error) {
      const callerAbort = abortFromSignal(options?.signal);
      if (callerAbort) {
        await this.close();
        throw callerAbort;
      }
      await this.throwMapped(error, true);
    }
  }

  async listTools(options?: McpRequestOptions): Promise<McpToolDefinition[]> {
    const tools: McpToolDefinition[] = [];
    const seenCursors = new Set<string>();
    let cursor: string | undefined;

    for (let pageNumber = 1; pageNumber <= MAX_CATALOG_PAGES; pageNumber += 1) {
      const page = validateToolPage(await this.perform(() => this.sdk.listToolsPage(cursor, options), options));
      tools.push(...page.tools);
      if (page.nextCursor === undefined) {
        this.indexDefinitions(tools);
        return tools;
      }
      if (seenCursors.has(page.nextCursor) || pageNumber === MAX_CATALOG_PAGES) {
        throw new ProtocolError("TickTick MCP returned an incomplete tool catalog.");
      }
      seenCursors.add(page.nextCursor);
      cursor = page.nextCursor;
    }

    throw new ProtocolError("TickTick MCP returned an incomplete tool catalog.");
  }

  async callTool(name: string, arguments_: JsonObject, options?: McpRequestOptions): Promise<McpToolCallResult> {
    const definitions = this.definitions.get(name);
    if (definitions?.length !== 1) throw new ProtocolError("The requested TickTick MCP tool is unavailable.");

    const result = await this.perform(() => this.sdk.callTool(name, arguments_, definitions[0], options), options);
    if (result.isError === true) throw new ProtocolError("TickTick MCP tool reported a failure.");
    return result.structuredContent === undefined
      ? { hasStructuredContent: false }
      : { hasStructuredContent: true, structuredContent: result.structuredContent };
  }

  close(): Promise<void> {
    if (!this.closePromise) {
      this.closePromise = Promise.resolve()
        .then(() => this.sdk.close())
        .catch(() => undefined);
    }
    return this.closePromise;
  }

  private indexDefinitions(tools: readonly McpToolDefinition[]): void {
    const definitions = new Map<string, McpToolDefinition[]>();
    for (const tool of tools) {
      const matches = definitions.get(tool.name) ?? [];
      matches.push(tool);
      definitions.set(tool.name, matches);
    }
    this.definitions = definitions;
  }

  private async perform<T>(operation: () => Promise<T>, options?: McpRequestOptions): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const callerAbort = abortFromSignal(options?.signal);
      if (callerAbort) throw callerAbort;
      return this.throwMapped(error, false);
    }
  }

  private async throwMapped(error: unknown, closeConnection: boolean): Promise<never> {
    if (isAbortError(error)) {
      if (closeConnection) await this.close();
      throw error;
    }

    if (error instanceof TickTickError) {
      if (closeConnection) await this.close();
      throw withoutCause(error);
    }

    if (error instanceof UnauthorizedError || httpStatus(error) === 401) {
      await this.invalidateAndClose();
      throw new AuthenticationError("TickTick MCP authentication expired. Sign in again.");
    }

    if (error instanceof InsufficientScopeError || httpStatus(error) === 403) {
      if (closeConnection) await this.close();
      throw new PermissionError("TickTick MCP does not grant the required task permissions.");
    }

    if (httpStatus(error) === 404) {
      if (closeConnection) await this.close();
      throw new ProtocolError("TickTick MCP could not resolve the requested operation.");
    }

    if (httpStatus(error) === 429) {
      if (closeConnection) await this.close();
      throw new RateLimitError("TickTick is temporarily rate limiting requests.");
    }

    const status = httpStatus(error);
    if ((status !== undefined && status >= 500) || isNetworkFailure(error)) {
      if (closeConnection) await this.close();
      throw new NetworkError("Unable to reach TickTick MCP. Check your connection and try again.");
    }

    if (error instanceof SdkProtocolError || error instanceof SdkError) {
      if (closeConnection) await this.close();
      throw new ProtocolError("TickTick MCP returned an unsupported response.");
    }

    if (closeConnection) await this.close();
    throw new ProtocolError("TickTick MCP request failed.");
  }

  private async invalidateAndClose(): Promise<void> {
    if (!this.invalidationPromise) {
      this.invalidationPromise = Promise.resolve()
        .then(() => this.auth.invalidate())
        .catch(() => undefined)
        .then(() => this.close());
    }
    await this.invalidationPromise;
  }
}

export function createSafeMcpFetch(fetchImpl: typeof fetch, now: () => number = Date.now): typeof fetch {
  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    let response: Response;
    try {
      response = await fetchImpl(input, init);
    } catch (error) {
      const callerAbort = abortFromSignal(init?.signal ?? undefined);
      if (callerAbort) throw callerAbort;
      if (isAbortError(error)) throw error;
      if (error instanceof TickTickError) throw withoutCause(error);
      throw new NetworkError("Unable to reach TickTick MCP. Check your connection and try again.");
    }

    if (response.status === 429) {
      throw new RateLimitError(
        "TickTick is temporarily rate limiting requests.",
        parseRetryAfter(response.headers.get("retry-after"), now)
      );
    }
    return response;
  };
}

export async function connectAuthenticatedMcpClient(
  auth: AuthProvider,
  sdk: McpSdkClientPort,
  options?: McpRequestOptions
): Promise<McpClientPort> {
  assertMcpAuthTarget(auth);
  const client = new AuthenticatedMcpClient(auth, sdk);
  await client.connect(options);
  return client;
}

export function assertMcpAuthTarget(auth: AuthProvider): void {
  if (auth.target !== "mcp") throw new AuthenticationError("The selected TickTick credential is not valid for MCP.");
}

function validateToolPage(value: unknown): McpToolPage {
  if (!isObject(value) || !Array.isArray(value.tools)) throw invalidCatalog();
  if (value.nextCursor !== undefined && (typeof value.nextCursor !== "string" || !value.nextCursor)) {
    throw invalidCatalog();
  }

  const tools = value.tools.map((tool) => {
    if (!isObject(tool) || typeof tool.name !== "string" || !tool.name.trim() || !isObject(tool.inputSchema)) {
      throw invalidCatalog();
    }
    if (tool.description !== undefined && typeof tool.description !== "string") throw invalidCatalog();
    if (tool.outputSchema !== undefined && !isObject(tool.outputSchema)) throw invalidCatalog();
    return tool as unknown as McpToolDefinition;
  });

  return value.nextCursor === undefined ? { tools } : { tools, nextCursor: value.nextCursor };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function invalidCatalog(): ProtocolError {
  return new ProtocolError("TickTick MCP returned an invalid tool catalog.");
}

function httpStatus(error: unknown): number | undefined {
  return error instanceof SdkHttpError ? error.status : undefined;
}

function isNetworkFailure(error: unknown): boolean {
  if (error instanceof SdkError && NETWORK_SDK_ERRORS.has(error.code)) return true;
  if (error instanceof TypeError) return true;
  if (error instanceof DOMException && (error.name === "NetworkError" || error.name === "TimeoutError")) return true;
  if (typeof error !== "object" || error === null || !("code" in error)) return false;
  return typeof error.code === "string" && NETWORK_ERROR_CODES.test(error.code);
}

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === "AbortError";
}

function abortFromSignal(signal?: AbortSignal | null): Error | undefined {
  if (!signal?.aborted) return undefined;
  return isAbortError(signal.reason) ? signal.reason : new DOMException("The operation was aborted.", "AbortError");
}

function parseRetryAfter(value: string | null, now: () => number): number | undefined {
  if (value === null) return undefined;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) {
    const seconds = Number(trimmed);
    const milliseconds = seconds * 1_000;
    return Number.isSafeInteger(seconds) && Number.isSafeInteger(milliseconds) ? milliseconds : undefined;
  }
  if (!HTTP_DATE.test(trimmed)) return undefined;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toUTCString() !== trimmed) return undefined;
  const currentTime = now();
  if (!Number.isFinite(currentTime)) return undefined;
  const delay = Math.max(0, timestamp - currentTime);
  return Number.isSafeInteger(delay) ? delay : undefined;
}

function withoutCause(error: TickTickError): TickTickError {
  if (error.cause === undefined) return error;
  if (error instanceof AuthenticationError) return new AuthenticationError(error.message);
  if (error instanceof PermissionError) return new PermissionError(error.message);
  if (error instanceof RateLimitError) return new RateLimitError(error.message, error.retryAfterMs);
  if (error instanceof ValidationError) return new ValidationError(error.message);
  if (error instanceof NotFoundError) return new NotFoundError(error.message);
  if (error instanceof NetworkError) return new NetworkError(error.message);
  if (error instanceof PartialRefreshError) return new PartialRefreshError(error.message);
  if (error instanceof ProtocolError) return new ProtocolError(error.message);
  if (error instanceof AmbiguousMutationError) return new AmbiguousMutationError(error.message);
  return new TickTickError(error.message, error.code, error.retryable, error.retryAfterMs);
}
