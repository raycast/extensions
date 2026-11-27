import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { FetchLike } from "@modelcontextprotocol/sdk/shared/transport.js";
import { INSPECT_SCRIPT, Inspection, parseInspection, singleToolArgument } from "./inspector";

const ENDPOINTS = ["http://[::1]:6767/sse", "http://127.0.0.1:6767/sse"];

export async function inspectDocuments(
  signal?: AbortSignal,
  endpoints: readonly string[] = ENDPOINTS,
): Promise<Inspection> {
  let connectionFailure: unknown;
  for (const endpoint of endpoints) {
    signal?.throwIfAborted();
    const configuredUrl = new URL(endpoint);
    if (
      configuredUrl.protocol !== "http:" ||
      !["[::1]", "127.0.0.1"].includes(configuredUrl.hostname) ||
      configuredUrl.username ||
      configuredUrl.password ||
      configuredUrl.pathname !== "/sse"
    ) {
      throw new Error("Affinity MCP endpoint must be a local loopback HTTP /sse server.");
    }
    const client = new Client({ name: "raycast-affinity-inspector", version: "1.0.0" });
    const origin = new URL(endpoint).origin;
    const localFetch: FetchLike = async (input, init) => {
      const url = new URL(String(input));
      if (url.origin !== origin)
        throw new Error("Affinity MCP attempted a connection outside the configured local server.");
      const signals = [AbortSignal.timeout(30_000), init?.signal, signal].filter(Boolean) as AbortSignal[];
      return fetch(input, { ...init, signal: AbortSignal.any(signals), redirect: "error" });
    };
    const transport = new SSEClientTransport(new URL(endpoint), { fetch: localFetch });
    try {
      await client.connect(transport, { timeout: 8_000, signal });
    } catch (error) {
      connectionFailure = error;
      await client.close().catch(() => undefined);
      continue;
    }
    try {
      const options = { timeout: 10_000, signal };
      const tools = (await client.listTools(undefined, options)).tools;
      const preamble = tools.find((tool) => tool.name === "read_sdk_documentation_topic");
      const legacyPreamble = tools.find((tool) => tool.name === "read_preamble");
      if (preamble) {
        const response = await client.callTool(
          { name: preamble.name, arguments: singleToolArgument(preamble, ["filename", "topic"], "preamble") },
          undefined,
          options,
        );
        if (response.isError) throw new Error("Affinity refused its required SDK preamble. Check MCP access settings.");
      } else if (legacyPreamble) {
        const response = await client.callTool({ name: legacyPreamble.name, arguments: {} }, undefined, options);
        if (response.isError) throw new Error("Affinity refused its required SDK preamble. Check MCP access settings.");
      } else {
        throw new Error("This Affinity MCP server does not expose its SDK preamble tool.");
      }
      const execute = tools.find((tool) => tool.name === "execute_script");
      if (!execute) throw new Error("This Affinity MCP server does not expose execute_script.");
      const response = await client.callTool(
        {
          name: execute.name,
          arguments: singleToolArgument(execute, ["script", "code", "javascript"], INSPECT_SCRIPT),
        },
        undefined,
        options,
      );
      if (response.isError) {
        throw new Error(
          "Affinity could not run the read-only inventory script. Its MCP/SDK compatibility needs verification.",
        );
      }
      return parseInspection(response);
    } finally {
      await client.close().catch(() => undefined);
    }
  }
  signal?.throwIfAborted();
  const detail =
    connectionFailure instanceof Error && connectionFailure.message.includes("protocol")
      ? " The installed server rejected the MCP protocol version; SDK compatibility needs verification."
      : "";
  throw new Error(
    `Cannot reach Affinity’s local MCP server. Open Affinity and enable Enable Affinity MCP in Settings → Model Context Protocol.${detail}`,
  );
}
