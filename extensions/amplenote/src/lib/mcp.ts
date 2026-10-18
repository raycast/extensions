import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport, StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export class AmplenoteConnectionError extends Error {}
export class AmplenoteUnavailableError extends AmplenoteConnectionError {}
export class AmplenoteAuthError extends AmplenoteConnectionError {}

export function isConnectionError(error: unknown): error is AmplenoteConnectionError {
  return error instanceof AmplenoteConnectionError;
}

export type ToolCaller = <T>(name: string, args?: Record<string, unknown>) => Promise<T>;

export function createToolCaller(url: string, token: string): ToolCaller {
  let connection: Promise<Client> | undefined;

  const connect = async () => {
    const client = new Client({ name: "raycast-amplenote", version: "1.0.0" });
    const transport = new StreamableHTTPClientTransport(new URL(url), {
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    });
    await client.connect(transport);
    return client;
  };

  const callOnce = async (name: string, args: Record<string, unknown>) => {
    const current = (connection ??= connect());
    try {
      return await (await current).callTool({ name, arguments: args });
    } catch (error) {
      if (connection === current) connection = undefined;
      void current.then((client) => client.close()).catch(() => undefined);
      throw error;
    }
  };

  return async <T>(name: string, args: Record<string, unknown> = {}): Promise<T> => {
    let result: Awaited<ReturnType<Client["callTool"]>>;
    try {
      result = await callOnce(name, args);
    } catch (error) {
      if (!isStaleSession(error)) throw toAmplenoteError(error);
      try {
        result = await callOnce(name, args);
      } catch (retryError) {
        throw toAmplenoteError(retryError);
      }
    }
    if (result.isError) {
      throw new Error(textContent(result.content) || `Amplenote could not run ${name}.`);
    }
    return (result.structuredContent ?? parseText(textContent(result.content))) as T;
  };
}

// Amplenote forgets MCP sessions when it restarts and answers the old session id with 404.
// The request never reached the tool, so retrying on a fresh session is safe, even for writes.
function isStaleSession(error: unknown): boolean {
  return error instanceof StreamableHTTPError && error.code === 404;
}

function parseText(text: string | undefined): unknown {
  if (text === undefined) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function textContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined;
  const text = content.find((item) => item?.type === "text");
  return typeof text?.text === "string" ? text.text : undefined;
}

function toAmplenoteError(error: unknown): unknown {
  if (error instanceof StreamableHTTPError && (error.code === 401 || error.code === 403)) {
    return new AmplenoteAuthError("Amplenote rejected the MCP token.");
  }
  const message = error instanceof Error ? error.message : String(error);
  const cause = (error as { cause?: { code?: string } })?.cause?.code;
  if (/\b(401|403)\b|unauthori[sz]ed/i.test(message)) {
    return new AmplenoteAuthError("Amplenote rejected the MCP token.");
  }
  if (cause === "ECONNREFUSED" || /ECONNREFUSED|fetch failed/i.test(message)) {
    return new AmplenoteUnavailableError("Amplenote's MCP server isn't reachable.");
  }
  return error;
}
