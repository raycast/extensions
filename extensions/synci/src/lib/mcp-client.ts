import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { MCP_URL } from "./config";
import { mcpArguments, type McpToolName } from "./mcp-input";
import { SignInRequiredError } from "./oauth-session";

export class SynciMcpError extends Error {}

/** MCP responses are already redacted and shaped by Synci's outbound transaction rules. */
export class SynciMcpClient {
  constructor(
    private token: () => Promise<string>,
    private transport: typeof fetch = fetch,
  ) {}

  async call(name: McpToolName, input: unknown = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
    const args = mcpArguments(name, input);
    signal?.throwIfAborted();
    const token = await this.token();
    const deadline = AbortSignal.timeout(45_000);
    const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
    requestSignal.throwIfAborted();
    const client = new Client({ name: "synci-raycast", version: "1.0.0" }, { capabilities: {} });
    const transport = new StreamableHTTPClientTransport(new URL(MCP_URL), {
      // OAuth stays in Raycast's shared PKCE store. MCP must never register another
      // client, follow auth challenges to another host, or expose tokens to AI.
      fetch: async (input, init) => {
        const url = input instanceof Request ? input.url : String(input);
        if (url !== MCP_URL) throw new SynciMcpError("Refused an unexpected Synci MCP endpoint.");
        const headers = new Headers(init?.headers);
        headers.set("Authorization", `Bearer ${token}`);
        const response = await this.transport(input, {
          ...init,
          headers,
          redirect: "error",
          signal: init?.signal ? AbortSignal.any([requestSignal, init.signal]) : requestSignal,
        });
        if (response.status === 401) throw new SignInRequiredError();
        if (response.status === 403) {
          const body: unknown = await response.json().catch(() => null);
          const message =
            body && typeof body === "object" && "message" in body && typeof body.message === "string"
              ? body.message
              : "";
          // Classify known server denials without returning arbitrary HTTP bodies.
          if (message === "An active Synci subscription is required to use the MCP server.")
            throw new SynciMcpError(
              "Synci requires an active subscription for AI access. Check your subscription in Synci.",
            );
          if (message === "The access token does not have the required scope.")
            throw new SynciMcpError(
              "The Raycast OAuth grant is missing Synci's mcp:use permission. The shared app must allow that read-only permission, then reconnect Synci to grant AI access.",
            );
          throw new SynciMcpError(
            "Synci denied MCP access. Open Synci to check this app's access, then launch Reconnect Synci in Raycast if needed.",
          );
        }
        if (response.status === 402)
          throw new SynciMcpError(
            "Synci requires an active subscription for AI access. Check your subscription in Synci.",
          );
        if (response.status === 429) {
          const retry = response.headers.get("retry-after");
          throw new SynciMcpError(
            `Synci's request limit was reached. Try again${retry && /^\d+$/.test(retry) ? ` in ${retry} seconds` : " shortly"}.`,
          );
        }
        // A server may decline the SDK's optional notification stream.
        if (!response.ok && !(init?.method === "GET" && response.status === 405))
          throw new SynciMcpError(
            `Synci's AI tools are temporarily unavailable (HTTP ${response.status}). Try again shortly.`,
          );
        return response;
      },
      reconnectionOptions: {
        maxRetries: 0,
        initialReconnectionDelay: 1000,
        maxReconnectionDelay: 1000,
        reconnectionDelayGrowFactor: 1,
      },
    });
    try {
      await client.connect(transport, { signal: requestSignal, timeout: 30_000 });
      const result = CallToolResultSchema.parse(
        await client.callTool({ name, arguments: args }, undefined, {
          signal: requestSignal,
          timeout: 30_000,
        }),
      );
      if (result.isError) {
        const message = result.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n");
        throw new SynciMcpError(
          (message || "Synci could not complete this request. Check your account access in Synci.")
            .replaceAll(token, "[redacted]")
            .slice(0, 2000),
        );
      }
      if (result.structuredContent) return result.structuredContent;
      // Older MCP servers return the same structured JSON in a text content block.
      const text = result.content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      const value: unknown = JSON.parse(text);
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Unexpected MCP result");
      return value as Record<string, unknown>;
    } catch (error) {
      if (error instanceof SignInRequiredError)
        throw new SynciMcpError(
          "Your Synci session has expired or was revoked. Launch Reconnect Synci in Raycast, then retry your question.",
        );
      if (error instanceof SynciMcpError) throw error;
      if (signal?.aborted) throw new SynciMcpError("The Synci request was canceled.");
      if (deadline.aborted)
        throw new SynciMcpError("Synci took too long to respond. Try again with a smaller date range or one account.");
      // SDK and HTTP errors can contain response bodies. Never relay them to AI.
      throw new SynciMcpError(
        "Could not read a valid response from Synci's AI tools. Check your connection and try again.",
      );
    } finally {
      // No financial records, session IDs, or tool responses are persisted.
      await client.close().catch(() => {});
    }
  }
}
