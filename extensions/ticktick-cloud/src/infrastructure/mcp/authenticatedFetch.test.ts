import {
  type Client,
  InsufficientScopeError,
  ProtocolError as SdkProtocolError,
  SdkError,
  SdkErrorCode,
  SdkHttpError,
  UnauthorizedError,
  type StreamableHTTPClientTransport,
} from "@modelcontextprotocol/client";
import { describe, expect, it, vi, type MockedFunction } from "vitest";
import {
  AuthenticationError,
  NetworkError,
  NotFoundError,
  PermissionError,
  ProtocolError,
  RateLimitError,
} from "../../domain/errors";
import { ApiTokenAuthProvider } from "../auth/ApiTokenAuthProvider";
import type { AuthProvider } from "../auth/AuthProvider";
import { MCP_RESOURCE } from "../auth/oauthMetadata";
import { connectAuthenticatedMcpClient, type McpSdkClientPort, type SdkToolCallResult } from "./authenticatedFetch";
import { createMcpTransport, createMcpTransportOptions } from "./createMcpClient";
import type { McpClientPort, McpToolDefinition, McpToolPage } from "./McpClientPort";

const SECRET = "access_token=super.secret-123";
const mutationTool: McpToolDefinition = {
  name: "update_task",
  inputSchema: { type: "object", properties: { taskId: { type: "string" } } },
  outputSchema: {
    type: "object",
    required: ["id"],
    properties: { id: { type: "string" } },
  },
};

function makeAuth(tokens: string[] = ["token-one"]): AuthProvider & {
  getAccessToken: ReturnType<typeof vi.fn>;
  invalidate: ReturnType<typeof vi.fn>;
} {
  let index = 0;
  return {
    target: "mcp",
    getAccessToken: vi.fn(async () => tokens[Math.min(index++, tokens.length - 1)]),
    invalidate: vi.fn(async () => undefined),
    accountCacheKey: vi.fn(async () => "api:mcp:test"),
  };
}

type MockedSdkClient = {
  [Method in keyof McpSdkClientPort]: MockedFunction<McpSdkClientPort[Method]>;
};

function makeSdk(overrides: Partial<MockedSdkClient> = {}): MockedSdkClient {
  return {
    connect: vi.fn<McpSdkClientPort["connect"]>(async () => undefined),
    listToolsPage: vi.fn<McpSdkClientPort["listToolsPage"]>(
      async (): Promise<McpToolPage> => ({ tools: [structuredClone(mutationTool)] })
    ),
    callTool: vi.fn<McpSdkClientPort["callTool"]>(
      async (): Promise<SdkToolCallResult> => ({
        isError: false,
        structuredContent: { id: "task-1" },
        content: [],
      })
    ),
    close: vi.fn<McpSdkClientPort["close"]>(async () => undefined),
    ...overrides,
  };
}

async function connectedMutationClient(sdk: McpSdkClientPort, auth: AuthProvider = makeAuth()): Promise<McpClientPort> {
  const client = await connectAuthenticatedMcpClient(auth, sdk);
  await client.listTools();
  return client;
}

function exposed(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  return [error.name, error.message, String(error.cause), error.stack ?? ""].join("\n");
}

async function captureFailure(action: () => Promise<unknown>): Promise<unknown> {
  try {
    await action();
  } catch (error) {
    return error;
  }
  throw new Error("Expected action to reject");
}

async function sendAccepted(transport: StreamableHTTPClientTransport, id: number): Promise<void> {
  await transport.send({ jsonrpc: "2.0", id, method: "ping" });
}

function httpFailure(status: number): SdkHttpError {
  return new SdkHttpError(SdkErrorCode.ClientHttpNotImplemented, `remote ${SECRET}`, {
    status,
    statusText: `remote ${SECRET}`,
    text: `remote ${SECRET}`,
  });
}

describe("MCP transport authentication", () => {
  it("rejects an OpenAPI-target provider before any token or network side effect", () => {
    const mcpAuth = makeAuth();
    const auth: AuthProvider = { ...mcpAuth, target: "openapi" };
    const fetchImpl = vi.fn(async () => new Response(null, { status: 202 }));

    expect(() => createMcpTransport(auth, fetchImpl)).toThrowError(AuthenticationError);
    expect(mcpAuth.getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an OpenAPI-target provider before an injected SDK client can connect", async () => {
    const mcpAuth = makeAuth();
    const auth: AuthProvider = { ...mcpAuth, target: "openapi" };
    const sdk = makeSdk();

    await expect(connectAuthenticatedMcpClient(auth, sdk)).rejects.toBeInstanceOf(AuthenticationError);
    expect(sdk.connect).not.toHaveBeenCalled();
    expect(sdk.close).not.toHaveBeenCalled();
    expect(mcpAuth.getAccessToken).not.toHaveBeenCalled();
  });

  it("configures a dynamic token-only provider, scope throw, and redirect rejection", async () => {
    const auth = makeAuth();
    const options = createMcpTransportOptions(auth);
    const provider = options.authProvider as { token: () => Promise<string>; onUnauthorized?: unknown };

    expect(Object.prototype.hasOwnProperty.call(provider, "onUnauthorized")).toBe(false);
    expect(options.onInsufficientScope).toBe("throw");
    expect(options.requestInit?.redirect).toBe("error");
    await expect(provider.token()).resolves.toBe("token-one");
  });

  it("puts authorization only in the header, never the URL, and rejects redirects", async () => {
    const auth = makeAuth(["header-only-token"]);
    const requests: Array<{ url: string; authorization: string | null; redirect: RequestInit["redirect"] }> = [];
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("authorization"),
        redirect: init?.redirect,
      });
      return new Response(null, { status: 202 });
    });
    const transport = createMcpTransport(auth, fetchImpl);
    await transport.start();

    await sendAccepted(transport, 1);
    await transport.close();

    expect(requests).toEqual([{ url: MCP_RESOURCE, authorization: "Bearer header-only-token", redirect: "error" }]);
    expect(requests[0].url).not.toContain("header-only-token");
    expect(new URL(requests[0].url).search).toBe("");
  });

  it("looks up the token before every transport request", async () => {
    const auth = makeAuth(["first-token", "second-token"]);
    const headers: Array<string | null> = [];
    const transport = createMcpTransport(auth, async (_input, init) => {
      headers.push(new Headers(init?.headers).get("authorization"));
      return new Response(null, { status: 202 });
    });
    await transport.start();

    await sendAccepted(transport, 1);
    await sendAccepted(transport, 2);
    await transport.close();

    expect(auth.getAccessToken).toHaveBeenCalledTimes(2);
    expect(headers).toEqual(["Bearer first-token", "Bearer second-token"]);
  });

  it("does not replay a request after a 401", async () => {
    const auth = makeAuth();
    const fetchImpl = vi.fn(
      async () => new Response(SECRET, { status: 401, headers: { "www-authenticate": "Bearer" } })
    );
    const transport = createMcpTransport(auth, fetchImpl);
    await transport.start();

    await expect(sendAccepted(transport, 1)).rejects.toBeInstanceOf(UnauthorizedError);
    await transport.close();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not reauthorize or replay an insufficient-scope request", async () => {
    const auth = makeAuth();
    const fetchImpl = vi.fn(
      async () =>
        new Response(SECRET, {
          status: 403,
          headers: { "www-authenticate": 'Bearer error="insufficient_scope", scope="tasks:write"' },
        })
    );
    const transport = createMcpTransport(auth, fetchImpl);
    await transport.start();

    await expect(sendAccepted(transport, 1)).rejects.toBeInstanceOf(InsufficientScopeError);
    await transport.close();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps Retry-After delta-seconds before the SDK can consume a remote body", async () => {
    const auth = makeAuth();
    const fetchImpl = vi.fn(async () => new Response(SECRET, { status: 429, headers: { "retry-after": "3" } }));
    const transport = createMcpTransport(auth, fetchImpl);
    await transport.start();

    const error = await captureFailure(() => sendAccepted(transport, 1));
    await transport.close();

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(3_000);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps Retry-After HTTP-date against the injected clock", async () => {
    const now = Date.UTC(2026, 7, 14, 12, 0, 0);
    const fetchImpl = vi.fn(
      async () =>
        new Response(SECRET, {
          status: 429,
          headers: { "retry-after": new Date(now + 5_000).toUTCString() },
        })
    );
    const transport = createMcpTransport(makeAuth(), fetchImpl, () => now);
    await transport.start();

    const error = await captureFailure(() => sendAccepted(transport, 1));
    await transport.close();

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBe(5_000);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid Retry-After value without inventing a retry delay", async () => {
    const fetchImpl = vi.fn(
      async () => new Response(SECRET, { status: 429, headers: { "retry-after": "-1 seconds" } })
    );
    const transport = createMcpTransport(makeAuth(), fetchImpl);
    await transport.start();

    const error = await captureFailure(() => sendAccepted(transport, 1));
    await transport.close();

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("rejects an impossible Retry-After IMF date instead of normalizing it", async () => {
    const now = Date.UTC(2026, 1, 1, 12, 0, 0);
    const fetchImpl = vi.fn(
      async () =>
        new Response(SECRET, {
          status: 429,
          headers: { "retry-after": "Tue, 31 Feb 2026 12:00:00 GMT" },
        })
    );
    const transport = createMcpTransport(makeAuth(), fetchImpl, () => now);
    await transport.start();

    const error = await captureFailure(() => sendAccepted(transport, 1));
    await transport.close();

    expect(error).toBeInstanceOf(RateLimitError);
    expect((error as RateLimitError).retryAfterMs).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps an offline fetch rejection without retaining its details", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError(`fetch failed ${SECRET}`);
    });
    const transport = createMcpTransport(makeAuth(), fetchImpl);
    await transport.start();

    const error = await captureFailure(() => sendAccepted(transport, 1));
    await transport.close();

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("authenticated MCP client boundary", () => {
  it("forwards optional request options through the connect boundary", async () => {
    const controller = new AbortController();
    const sdk = makeSdk();

    const client = await connectAuthenticatedMcpClient(makeAuth(), sdk, {
      signal: controller.signal,
      timeoutMs: 1_987,
    });
    await client.close();

    expect(sdk.connect).toHaveBeenCalledWith({ signal: controller.signal, timeoutMs: 1_987 });
  });

  it("preserves a pre-aborted signal reason during connect and closes without invalidating", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    const controller = new AbortController();
    controller.abort(abort);
    const auth = makeAuth();
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        throw new SdkError(SdkErrorCode.RequestTimeout, `remote ${SECRET}`);
      }),
    });

    const error = await captureFailure(() =>
      connectAuthenticatedMcpClient(auth, sdk, { signal: controller.signal, timeoutMs: 1_987 })
    );

    expect(error).toBe(abort);
    expect(sdk.connect).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it("maps an SDK connect timeout to NetworkError and closes without invalidating", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        throw new SdkError(SdkErrorCode.RequestTimeout, `remote ${SECRET}`, { detail: SECRET });
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk, { timeoutMs: 1_987 }));

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.connect).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it("maps an SDK HTTP 404 during connect to ProtocolError and closes without invalidating", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        throw httpFailure(404);
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk));

    expect(error).toBeInstanceOf(ProtocolError);
    expect(error).not.toBeInstanceOf(NotFoundError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.connect).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it("preserves a missing API-token AuthenticationError and closes a failed connect", async () => {
    const auth = new ApiTokenAuthProvider("mcp", () => ({ apiToken: undefined }));
    const invalidate = vi.spyOn(auth, "invalidate");
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        await auth.getAccessToken();
      }),
      close: vi.fn(async () => {
        throw new Error(`close ${SECRET}`);
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk));

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as Error).message).toBe("Enter a TickTick API Token in extension preferences.");
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(invalidate).not.toHaveBeenCalled();
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("preserves an OAuth AuthenticationError while removing its raw cause", async () => {
    const auth = makeAuth();
    auth.getAccessToken.mockRejectedValue(
      new AuthenticationError("OAuth authorization could not be completed safely.", new Error(SECRET))
    );
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        await auth.getAccessToken();
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk));

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as Error).message).toBe("OAuth authorization could not be completed safely.");
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(auth.invalidate).not.toHaveBeenCalled();
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("invalidates once and closes best-effort when connect returns 401", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        throw new UnauthorizedError(SECRET);
      }),
      close: vi.fn(async () => {
        throw new Error(`close ${SECRET}`);
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk));

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
    expect(auth.invalidate).toHaveBeenCalledTimes(1);
    expect(sdk.connect).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("closes best-effort and sanitizes an unknown 500 failure during connect", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      connect: vi.fn(async () => {
        throw new Error(`500 response body: ${SECRET}`);
      }),
      close: vi.fn(async () => {
        throw new Error(`close body: ${SECRET}`);
      }),
    });

    const error = await captureFailure(() => connectAuthenticatedMcpClient(auth, sdk));

    expect(error).toBeInstanceOf(ProtocolError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
    expect(auth.invalidate).not.toHaveBeenCalled();
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("invalidates once, closes, and never replays a mutation after 401", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new UnauthorizedError(SECRET);
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const error = await captureFailure(() => client.callTool("update_task", { taskId: "task-1" }));
    await client.close();

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("maps an SDK HTTP 401, invalidates once across concurrent failures, and closes", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw httpFailure(401);
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const errors = await Promise.all([
      captureFailure(() => client.callTool("update_task", { taskId: "task-1" })),
      captureFailure(() => client.callTool("update_task", { taskId: "task-2" })),
    ]);

    expect(errors).toHaveLength(2);
    expect(errors.every((error) => error instanceof AuthenticationError)).toBe(true);
    expect(errors.every((error) => !exposed(error).includes("super.secret-123"))).toBe(true);
    expect(sdk.callTool).toHaveBeenCalledTimes(2);
    expect(auth.invalidate).toHaveBeenCalledTimes(1);
    expect(sdk.close).toHaveBeenCalledTimes(1);
  });

  it("preserves a local AuthenticationError during a mutation without invalidation or replay", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new AuthenticationError("OAuth authorization could not be completed safely.", new Error(SECRET));
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const error = await captureFailure(() => client.callTool("update_task", { taskId: "task-1" }));
    await client.close();

    expect(error).toBeInstanceOf(AuthenticationError);
    expect((error as Error).message).toBe("OAuth authorization could not be completed safely.");
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it("maps insufficient scope without invalidation or mutation replay", async () => {
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new InsufficientScopeError({ errorDescription: SECRET, requiredScope: "tasks:write" });
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const error = await captureFailure(() => client.callTool("update_task", { taskId: "task-1" }));
    await client.close();

    expect(error).toBeInstanceOf(PermissionError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it.each([
    [403, PermissionError],
    [404, ProtocolError],
    [429, RateLimitError],
    [500, NetworkError],
    [503, NetworkError],
  ])("maps SDK HTTP %i safely without replay", async (status, ExpectedError) => {
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw httpFailure(status);
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const error = await captureFailure(() => client.callTool("update_task", { taskId: "task-1" }));
    await client.close();

    expect(error).toBeInstanceOf(ExpectedError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it.each([
    SdkErrorCode.RequestTimeout,
    SdkErrorCode.NotConnected,
    SdkErrorCode.ConnectionClosed,
    SdkErrorCode.SendFailed,
    SdkErrorCode.EraNegotiationFailed,
  ])("maps SDK network failure %s safely without replay", async (code) => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new SdkError(code, `remote ${SECRET}`, { detail: SECRET });
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", { taskId: "task-1" }));
    await client.close();

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("maps SDK protocol/schema failures without retaining remote details", async () => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new SdkProtocolError(-32602, `remote ${SECRET}`, { body: SECRET });
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect((error as Error).cause).toBeUndefined();
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("preserves a safe existing TickTick error instead of erasing its subtype", async () => {
    const expected = new NotFoundError("The TickTick task no longer exists.");
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw expected;
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBe(expected);
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("preserves an AbortError exactly and never invalidates or replays", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    const auth = makeAuth();
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw abort;
      }),
    });
    const client = await connectedMutationClient(sdk, auth);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBe(abort);
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
    expect(auth.invalidate).not.toHaveBeenCalled();
  });

  it("restores the caller AbortError when the SDK reports an aborted request as a timeout", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    const controller = new AbortController();
    controller.abort(abort);
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new SdkError(SdkErrorCode.RequestTimeout, `remote ${SECRET}`);
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}, { signal: controller.signal }));
    await client.close();

    expect(error).toBe(abort);
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("forwards request options through catalog reads and tool calls", async () => {
    const listController = new AbortController();
    const callController = new AbortController();
    const sdk = makeSdk();
    const client = await connectAuthenticatedMcpClient(makeAuth(), sdk);

    await client.listTools({ signal: listController.signal, timeoutMs: 1_234 });
    await client.callTool("update_task", { taskId: "task-1" }, { signal: callController.signal, timeoutMs: 2_345 });
    await client.close();

    expect(sdk.listToolsPage).toHaveBeenCalledWith(undefined, {
      signal: listController.signal,
      timeoutMs: 1_234,
    });
    expect(sdk.callTool).toHaveBeenCalledWith("update_task", { taskId: "task-1" }, mutationTool, {
      signal: callController.signal,
      timeoutMs: 2_345,
    });
  });

  it("translates port timeoutMs into the installed SDK timeout option", async () => {
    const module = await import("./createMcpClient");
    type AdapterConstructor = new (client: Client, transport: StreamableHTTPClientTransport) => McpSdkClientPort;
    const Adapter = (module as unknown as { ModelContextProtocolSdkClient?: AdapterConstructor })
      .ModelContextProtocolSdkClient;
    expect(Adapter).toBeTypeOf("function");

    const connect = vi.fn(async () => undefined);
    const request = vi.fn(async () => ({ tools: [structuredClone(mutationTool)] }));
    const callTool = vi.fn(async () => ({ isError: false, content: [], structuredContent: { id: "task-1" } }));
    const transport = {} as StreamableHTTPClientTransport;
    const sdk = new Adapter!(
      {
        connect,
        request,
        callTool,
        close: vi.fn(async () => undefined),
      } as unknown as Client,
      transport
    );
    const listController = new AbortController();
    const callController = new AbortController();

    await sdk.connect({ signal: listController.signal, timeoutMs: 3_210 });
    await sdk.listToolsPage(undefined, { signal: listController.signal, timeoutMs: 4_321 });
    await sdk.callTool("update_task", { taskId: "task-1" }, mutationTool, {
      signal: callController.signal,
      timeoutMs: 5_432,
    });

    expect(connect).toHaveBeenCalledWith(transport, { signal: listController.signal, timeout: 3_210 });
    expect(request).toHaveBeenCalledWith({ method: "tools/list" }, expect.anything(), {
      signal: listController.signal,
      timeout: 4_321,
    });
    expect(callTool).toHaveBeenCalledWith(
      { name: "update_task", arguments: { taskId: "task-1" } },
      { toolDefinition: mutationTool, signal: callController.signal, timeout: 5_432 }
    );
  });

  it("sanitizes unknown SDK and remote body failures", async () => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => {
        throw new Error(`500 body ${SECRET}`);
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("rejects a repeating catalog cursor instead of returning a partial aggregate", async () => {
    const sdk = makeSdk({
      listToolsPage: vi
        .fn()
        .mockResolvedValueOnce({ tools: [structuredClone(mutationTool)], nextCursor: "cursor-1" })
        .mockResolvedValueOnce({ tools: [], nextCursor: "cursor-1" }),
    });
    const client = await connectAuthenticatedMcpClient(makeAuth(), sdk);

    const error = await captureFailure(() => client.listTools());
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect((error as Error).message).toBe("TickTick MCP returned an incomplete tool catalog.");
    expect(sdk.listToolsPage).toHaveBeenCalledTimes(2);
  });

  it("rejects a catalog that exceeds the page cap without returning partial tools", async () => {
    const sdk = makeSdk({
      listToolsPage: vi.fn(async (cursor?: string) => ({
        tools: cursor === undefined ? [structuredClone(mutationTool)] : [],
        nextCursor: `cursor-${cursor === undefined ? 1 : Number(cursor.slice(7)) + 1}`,
      })),
    });
    const client = await connectAuthenticatedMcpClient(makeAuth(), sdk);

    const error = await captureFailure(() => client.listTools());
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect((error as Error).message).toBe("TickTick MCP returned an incomplete tool catalog.");
    expect(sdk.listToolsPage).toHaveBeenCalledTimes(64);
  });

  it("sanitizes isError tool content", async () => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => ({
        isError: true,
        content: [{ type: "text", text: `failed ${SECRET}` }],
      })),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect((error as Error).cause).toBeUndefined();
  });

  it("does not infer typed output from text-only success", async () => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => ({
        isError: false,
        content: [{ type: "text", text: JSON.stringify({ id: "not-typed" }) }],
      })),
    });
    const client = await connectedMutationClient(sdk);

    const result = await client.callTool("update_task", {});
    await client.close();

    expect(result).toEqual({ hasStructuredContent: false });
    expect(JSON.stringify(result)).not.toContain("not-typed");
  });

  it.each([null, false, 0, ""])("preserves present falsy structured content: %j", async (value) => {
    const sdk = makeSdk({
      callTool: vi.fn(async () => ({ isError: false, content: [], structuredContent: value })),
    });
    const client = await connectedMutationClient(sdk);

    const result = await client.callTool("update_task", {});
    await client.close();

    expect(result).toEqual({ hasStructuredContent: true, structuredContent: value });
  });

  it("passes the catalog definition for SDK output validation and sanitizes incompatibility", async () => {
    const sdk = makeSdk({
      callTool: vi.fn(async (_name, _arguments, definition) => {
        expect(definition).toEqual(mutationTool);
        throw new Error(`structured output incompatible: ${SECRET}`);
      }),
    });
    const client = await connectedMutationClient(sdk);

    const error = await captureFailure(() => client.callTool("update_task", {}));
    await client.close();

    expect(error).toBeInstanceOf(ProtocolError);
    expect(exposed(error)).not.toContain("super.secret-123");
    expect(sdk.callTool).toHaveBeenCalledTimes(1);
  });

  it("makes close idempotent and best-effort after success", async () => {
    const sdk = makeSdk({
      close: vi.fn(async () => {
        throw new Error(`close failed ${SECRET}`);
      }),
    });
    const client = await connectAuthenticatedMcpClient(makeAuth(), sdk);

    await Promise.all([client.close(), client.close(), client.close()]);

    expect(sdk.close).toHaveBeenCalledTimes(1);
  });
});
