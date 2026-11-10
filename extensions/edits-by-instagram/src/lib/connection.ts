import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ConnectionError, safeConnectionError, type ConnectionConfig } from "./config";

export function createLocalFetch(
  config: ConnectionConfig,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): typeof fetch {
  return async (input, init) => {
    const requestUrl = new URL(input instanceof Request ? input.url : input.toString());
    if (requestUrl.origin !== config.endpoint.origin || requestUrl.username || requestUrl.password) {
      throw new ConnectionError(
        "Connection blocked",
        "The server requested a different origin. Check the configuration in Edits.",
      );
    }
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value, key) => headers.set(key, value));
    if (config.token) headers.set("Authorization", `Bearer ${config.token}`);
    const requestSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const response = await fetcher(input, {
      ...init,
      headers,
      redirect: "manual",
      signal: requestSignal ? AbortSignal.any([signal, requestSignal]) : signal,
    });
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      throw new ConnectionError(
        "Redirect blocked",
        "Use the exact local endpoint provided by Edits. Redirects are not followed.",
      );
    }
    if (response.status === 401 || response.status === 403) {
      await response.body?.cancel();
      throw new ConnectionError(
        "Authentication failed",
        "Check the automation credential in Edits and update extension preferences.",
      );
    }
    return response;
  };
}

export async function withEditsClient<T>(
  config: ConnectionConfig,
  operation: (client: Client, signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 30_000,
): Promise<T> {
  const deadline = AbortSignal.timeout(timeoutMs);
  const sessionSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const guardedFetch = createLocalFetch(config, sessionSignal);
  const transport = new StreamableHTTPClientTransport(config.endpoint, {
    fetch: guardedFetch,
    reconnectionOptions: {
      maxRetries: 0,
      initialReconnectionDelay: 1000,
      maxReconnectionDelay: 1000,
      reconnectionDelayGrowFactor: 1,
    },
  });
  const client = new Client({ name: "raycast-edits", version: "0.1.0" });
  client.onerror = () => {};
  const abort = () => {
    void client.close().catch(() => {});
  };
  sessionSignal.addEventListener("abort", abort, { once: true });
  try {
    sessionSignal.throwIfAborted();
    await client.connect(transport, { signal: sessionSignal, timeout: Math.min(10_000, timeoutMs) });
    if (client.getServerVersion()?.name !== "metapilot-native") {
      throw new ConnectionError(
        "Unexpected server",
        "This endpoint did not identify itself as the verified Edits MCP server. Check the endpoint in Edits.",
      );
    }
    return await operation(client, sessionSignal);
  } catch (error) {
    // Preserve our action-specific errors, particularly indeterminate mutation outcomes.
    if (error instanceof ConnectionError) throw error;
    if (deadline.aborted) throw new ConnectionError("Connection timed out", "Check Edits and refresh the connection.");
    throw safeConnectionError(error);
  } finally {
    sessionSignal.removeEventListener("abort", abort);
    await client.close().catch(() => {});
    await transport.close().catch(() => {});
  }
}
