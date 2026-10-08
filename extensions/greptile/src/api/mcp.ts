import { getGreptileApiKey } from "../preferences";
import { logger } from "../helpers/logger";

const GREPTILE_MCP_URL = "https://api.greptile.com/mcp";
const GREPTILE_REQUEST_TIMEOUT_MS = 45_000;

type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
};

type McpContentResult = {
  content?: {
    type?: string;
    text?: string;
  }[];
  isError?: boolean;
};

let requestId = 0;
const inFlightRequests = new Map<string, Promise<unknown>>();

export async function callGreptileTool<T>(
  name: string,
  args: Record<string, unknown>,
) {
  const requestKey = JSON.stringify({ name, args });

  if (inFlightRequests.has(requestKey)) {
    logger.debug("Reusing Greptile API request", {
      url: GREPTILE_MCP_URL,
      method: "POST",
      tool: name,
      arguments: args,
    });

    return inFlightRequests.get(requestKey) as Promise<T>;
  }

  const id = ++requestId;
  const startedAt = Date.now();
  const requestBody = {
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  };

  logger.debug("Calling Greptile API", {
    url: GREPTILE_MCP_URL,
    method: "POST",
    jsonrpcMethod: requestBody.method,
    tool: name,
    arguments: args,
    requestId: id,
  });

  const request = executeGreptileTool<T>(
    name,
    args,
    id,
    startedAt,
    requestBody,
  );

  inFlightRequests.set(requestKey, request);

  try {
    return await request;
  } finally {
    inFlightRequests.delete(requestKey);
  }
}

async function executeGreptileTool<T>(
  name: string,
  args: Record<string, unknown>,
  id: number,
  startedAt: number,
  requestBody: Record<string, unknown>,
) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    GREPTILE_REQUEST_TIMEOUT_MS,
  );
  let response: Response;

  try {
    response = await fetch(GREPTILE_MCP_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getGreptileApiKey()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(
        `Greptile request timed out after ${GREPTILE_REQUEST_TIMEOUT_MS / 1000} seconds.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const responseReceivedAt = Date.now();

  const payload = (await response.json().catch(() => undefined)) as
    | JsonRpcResponse
    | undefined;
  const bodyParsedAt = Date.now();

  logger.debug("Greptile API response", {
    url: GREPTILE_MCP_URL,
    method: "POST",
    tool: name,
    arguments: args,
    requestId: id,
    status: response.status,
    ok: response.ok,
    error: payload?.error,
    timings: {
      requestMs: responseReceivedAt - startedAt,
      bodyParseMs: bodyParsedAt - responseReceivedAt,
    },
  });

  if (!response.ok) {
    throw new Error(
      payload?.error?.message ||
        `Greptile request failed with HTTP ${response.status}`,
    );
  }

  if (!payload) {
    throw new Error("Greptile returned an empty response.");
  }

  if (payload.error) {
    throw new Error(payload.error.message);
  }

  const result = unwrapToolResult<T>(payload.result);
  const resultParsedAt = Date.now();

  logger.debug("Greptile API completed", {
    url: GREPTILE_MCP_URL,
    method: "POST",
    tool: name,
    arguments: args,
    requestId: id,
    timings: {
      requestMs: responseReceivedAt - startedAt,
      bodyParseMs: bodyParsedAt - responseReceivedAt,
      unwrapMs: resultParsedAt - bodyParsedAt,
      totalMs: resultParsedAt - startedAt,
    },
    result: summarizeResult(result),
  });

  return result;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function unwrapToolResult<T>(result: unknown): T {
  const contentResult = result as McpContentResult;

  if (contentResult?.isError) {
    throw new Error(
      getTextContent(contentResult) || "Greptile tool returned an error.",
    );
  }

  const text = getTextContent(contentResult);

  if (!text) {
    return result as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as T;
  }
}

function getTextContent(result: McpContentResult) {
  if (!Array.isArray(result?.content)) {
    return undefined;
  }

  const text = result.content
    .filter((entry) => entry.type === "text" && typeof entry.text === "string")
    .map((entry) => entry.text)
    .join("\n")
    .trim();

  return text || undefined;
}

function summarizeResult(result: unknown) {
  if (!result || typeof result !== "object") {
    return { type: typeof result };
  }

  if (Array.isArray(result)) {
    return { type: "array", length: result.length };
  }

  const record = result as Record<string, unknown>;

  return {
    type: "object",
    keys: Object.keys(record),
    counts: {
      mergeRequests: Array.isArray(record.mergeRequests)
        ? record.mergeRequests.length
        : undefined,
      codeReviews: Array.isArray(record.codeReviews)
        ? record.codeReviews.length
        : undefined,
      comments: Array.isArray(record.comments)
        ? record.comments.length
        : undefined,
    },
  };
}
