import { randomUUID } from "node:crypto";
import fetch, { RequestInit, Response } from "node-fetch";
import { z } from "zod";
import { APIPlainNode } from "../types/types";
import {
  HealthSchema,
  ImportResult,
  ImportResultSchema,
  McpToolResult,
  McpToolResultSchema,
  TanaHealth,
  TanaTool,
  TanaToolArguments,
  ToolDescriptor,
  ToolDescriptorSchema,
} from "./contracts";
import { createTanaError, isTanaClientError } from "./errors";

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

type JsonRpcResponse = {
  error?: { code?: number; message?: string; data?: unknown };
  result?: unknown;
};

export type TanaMcpClient = {
  workspaceId: string;
  health(signal?: AbortSignal): Promise<TanaHealth>;
  initialize(signal?: AbortSignal): Promise<Record<string, unknown>>;
  listTools(signal?: AbortSignal): Promise<ToolDescriptor[]>;
  callTool<Name extends TanaTool>(
    name: Name,
    args: TanaToolArguments[Name],
    signal?: AbortSignal,
  ): Promise<McpToolResult>;
  openNode(nodeId: string, openType?: "current" | "panel" | "tab", signal?: AbortSignal): Promise<void>;
  moveNode(
    nodeId: string,
    targetNodeId: string,
    options?: {
      sourceParentId?: string;
      position?: "start" | "end" | "after" | "before";
      referenceNodeId?: string;
      keepSourceReference?: boolean;
    },
    signal?: AbortSignal,
  ): Promise<void>;
  createNode(node: APIPlainNode, targetNodeId: string, signal?: AbortSignal): Promise<ImportResult>;
};

export type TanaMcpClientOptions = {
  token: string;
  workspaceId: string;
  endpoint?: string;
  fetch?: Fetch;
  timeoutMs?: number;
  healthTimeoutMs?: number;
};

const parseResponseBody = async (response: Response, token: string): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();
  const payload = contentType.includes("text/event-stream")
    ? body
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter((line) => line && line !== "[DONE]")
        .at(-1)
    : body;

  if (!contentType.includes("json") && !contentType.includes("text/event-stream")) {
    throw createTanaError("protocol", `Tana returned unsupported content type: ${contentType || "unknown"}`, {
      secrets: [token, body],
    });
  }

  try {
    return JSON.parse(payload || "null");
  } catch (error) {
    throw createTanaError("protocol", "Tana returned an invalid JSON response", {
      cause: error,
      secrets: [token, body],
    });
  }
};

const linkAbortSignal = (controller: AbortController, signal?: AbortSignal) => {
  if (!signal) return () => undefined;
  const abort = () => controller.abort(signal.reason);
  if (signal.aborted) abort();
  else signal.addEventListener("abort", abort, { once: true });
  return () => signal.removeEventListener("abort", abort);
};

const requestWithTimeout = async (
  fetcher: Fetch,
  url: string,
  init: RequestInit,
  timeoutMs: number,
  signal?: AbortSignal,
) => {
  const controller = new AbortController();
  const unlink = linkAbortSignal(controller, signal);
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetcher(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) {
      throw createTanaError("timeout", `Tana did not respond within ${timeoutMs}ms`, { cause: error });
    }
    if (signal?.aborted) throw error;
    throw createTanaError("not-running", "Tana Desktop is not reachable at localhost:8262", { cause: error });
  } finally {
    clearTimeout(timeout);
    unlink();
  }
};

const parseToolResult = (value: unknown, token: string): McpToolResult => {
  const parsed = McpToolResultSchema.safeParse(value);
  if (!parsed.success) {
    throw createTanaError("protocol", "Tana returned an invalid MCP tool result", {
      cause: parsed.error,
      secrets: [token],
    });
  }

  const toolMessage = parsed.data.content.reduce<string | undefined>(
    (message, content) => message ?? ("text" in content && typeof content.text === "string" ? content.text : undefined),
    undefined,
  );
  if (parsed.data.isError) {
    throw createTanaError("tool", toolMessage || "Tana tool call failed", { secrets: [token] });
  }
  return parsed.data;
};

const parseImportResult = (result: McpToolResult): ImportResult => {
  const structured = ImportResultSchema.safeParse(result.structuredContent);
  if (structured.success) return structured.data;

  const text = result.content.reduce<string | undefined>(
    (message, content) => message ?? ("text" in content && typeof content.text === "string" ? content.text : undefined),
    undefined,
  );
  if (text) {
    try {
      const parsed = ImportResultSchema.safeParse(JSON.parse(text));
      if (parsed.success) return parsed.data;
    } catch {
      // Some Tana versions return a human-readable success message only.
    }
    const createdNodes = [...text.matchAll(/^- (\S+) \("(.*)"\)$/gm)].map((match) => ({
      nodeId: match[1],
      name: match[2],
    }));
    if (createdNodes.length) return { createdNodes };
  }
  return { createdNodes: [] };
};

export const createTanaMcpClient = ({
  token,
  workspaceId,
  endpoint = "http://127.0.0.1:8262/mcp",
  fetch: fetcher = fetch,
  timeoutMs = 8_000,
  healthTimeoutMs = 2_000,
}: TanaMcpClientOptions): TanaMcpClient => {
  const normalizedToken = token.trim();
  const normalizedWorkspaceId = workspaceId.trim();
  const healthUrl = new URL("/health", endpoint).toString();
  const apiRoot = new URL("/", endpoint);

  const rpc = async <Result>(
    method: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
  ): Promise<Result> => {
    const response = await requestWithTimeout(
      fetcher,
      endpoint,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: randomUUID(), method, params }),
      },
      timeoutMs,
      signal,
    );
    if (response.status === 401 || response.status === 403) {
      throw createTanaError("auth", "Tana rejected the Personal Token", { status: response.status });
    }
    if (!response.ok) {
      throw createTanaError("protocol", `Tana returned HTTP ${response.status}`, { status: response.status });
    }
    const payload = (await parseResponseBody(response, normalizedToken)) as JsonRpcResponse;
    if (payload.error) {
      throw createTanaError("protocol", payload.error.message || "Tana returned a JSON-RPC error", {
        status: payload.error.code,
        secrets: [normalizedToken],
      });
    }
    if (!("result" in payload)) throw createTanaError("protocol", "Tana returned no JSON-RPC result");
    return payload.result as Result;
  };

  const callTool = async <Name extends TanaTool>(name: Name, args: TanaToolArguments[Name], signal?: AbortSignal) =>
    parseToolResult(await rpc<unknown>("tools/call", { name, arguments: args }, signal), normalizedToken);

  const rest = async (path: string, init: RequestInit, signal?: AbortSignal) => {
    const response = await requestWithTimeout(
      fetcher,
      new URL(path.replace(/^\//, ""), apiRoot).toString(),
      {
        ...init,
        headers: {
          Authorization: `Bearer ${normalizedToken}`,
          "Content-Type": "application/json",
          ...init.headers,
        },
      },
      timeoutMs,
      signal,
    );
    if (response.status === 401 || response.status === 403) {
      throw createTanaError("auth", "Tana rejected the Personal Token", { status: response.status });
    }
    if (!response.ok) {
      throw createTanaError("protocol", `Tana returned HTTP ${response.status}`, { status: response.status });
    }
    await parseResponseBody(response, normalizedToken);
  };

  return {
    workspaceId: normalizedWorkspaceId,
    async health(signal) {
      try {
        const response = await requestWithTimeout(fetcher, healthUrl, { method: "GET" }, healthTimeoutMs, signal);
        if (!response.ok) throw createTanaError("protocol", `Tana health returned HTTP ${response.status}`);
        return HealthSchema.parse(await parseResponseBody(response, normalizedToken));
      } catch (error) {
        if (isTanaClientError(error)) throw error;
        if (error instanceof z.ZodError) {
          throw createTanaError("protocol", "Tana returned an invalid health response", { cause: error });
        }
        throw error;
      }
    },
    initialize: (signal) =>
      rpc<Record<string, unknown>>(
        "initialize",
        {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "raycast-tana", version: "1.0.0" },
        },
        signal,
      ),
    async listTools(signal) {
      const result = await rpc<{ tools?: unknown[] }>("tools/list", {}, signal);
      return z.array(ToolDescriptorSchema).parse(result.tools ?? []);
    },
    callTool,
    openNode: async (nodeId, openType = "current", signal) => {
      await rest(
        `/nodes/${encodeURIComponent(nodeId)}/open`,
        { method: "POST", body: JSON.stringify({ openType }) },
        signal,
      );
    },
    moveNode: async (nodeId, targetNodeId, options = {}, signal) => {
      await rest(
        `/nodes/${encodeURIComponent(nodeId)}/move`,
        { method: "POST", body: JSON.stringify({ targetNodeId, ...options }) },
        signal,
      );
    },
    async createNode(node, targetNodeId, signal) {
      const parentNodeId = targetNodeId === "INBOX" ? `${normalizedWorkspaceId}_CAPTURE_INBOX` : targetNodeId;
      const tags = node.supertags?.map(({ id }) => ` #[[^${id}]]`).join("") ?? "";
      const result = parseImportResult(
        await callTool("import_tana_paste", { parentNodeId, content: `- ${node.name}${tags}` }, signal),
      );
      if (!result.createdNodes.length) {
        throw createTanaError("protocol", "Tana confirmed the import but did not return a created node ID");
      }
      return result;
    },
  };
};
