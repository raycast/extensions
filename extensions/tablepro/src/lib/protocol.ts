import { StreamableHTTPError } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";
import { MIN_TABLEPRO_VERSION } from "./app";
import {
  ExternalAccessDeniedError,
  MCPNotRunningError,
  MCPSessionExpiredError,
  RateLimitedError,
  ServerDisabledError,
  TokenExpiredError,
  TokenRevokedError,
  ToolError,
  UpdateRequiredError,
} from "./types";

export const RPC_CODE = {
  connectionClosed: -32_000,
  // TablePro before 0.67 answered a denied call with -32007.
  legacyForbidden: -32_007,
  methodNotFound: -32_601,
  unsupportedProtocolVersion: -32_022,
  sessionNotFound: -33_001,
  serverDisabled: -33_006,
  forbidden: -33_007,
  expired: -33_008,
  unauthenticated: -33_009,
  rateLimited: -33_010,
} as const;

const KNOWN_TOOL_ERROR_CODES = new Set([
  "invalid_argument",
  "not_connected",
  "not_found",
  "denied",
  "timeout",
  "unsupported",
  "query_failed",
  "user_cancelled",
  "internal_failure",
]);

export interface RpcErrorBody {
  code?: number;
  message?: string;
}

export function parseRpcErrorBody(text: string): RpcErrorBody | undefined {
  const start = text.indexOf("{");
  if (start === -1) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text.slice(start));
  } catch {
    return undefined;
  }
  if (typeof parsed !== "object" || parsed === null) return undefined;
  const error = (parsed as { error?: unknown }).error;
  if (typeof error === "object" && error !== null) {
    const { code, message } = error as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "number" ? code : undefined,
      message: typeof message === "string" ? message : undefined,
    };
  }
  if (typeof error === "string") {
    const description = (parsed as { error_description?: unknown })
      .error_description;
    return {
      message: typeof description === "string" ? description : error,
    };
  }
  return undefined;
}

function errorForRpcCode(
  code: number | undefined,
  message: string,
): Error | undefined {
  switch (code) {
    case RPC_CODE.forbidden:
    case RPC_CODE.legacyForbidden:
      return new ExternalAccessDeniedError(message);
    case RPC_CODE.expired:
      return new TokenExpiredError();
    case RPC_CODE.unauthenticated:
      return new TokenRevokedError();
    case RPC_CODE.rateLimited:
      return new RateLimitedError();
    case RPC_CODE.serverDisabled:
      return new ServerDisabledError();
    case RPC_CODE.unsupportedProtocolVersion:
      return new UpdateRequiredError(MIN_TABLEPRO_VERSION);
    case RPC_CODE.sessionNotFound:
      return new MCPSessionExpiredError(message);
    case RPC_CODE.connectionClosed:
      return new MCPNotRunningError();
    default:
      return undefined;
  }
}

function translateHttpError(err: StreamableHTTPError): Error {
  const body = parseRpcErrorBody(err.message);
  const message = body?.message ?? err.message;
  const byCode = errorForRpcCode(body?.code, message);
  if (byCode) return byCode;
  switch (err.code) {
    case 401:
      return new TokenRevokedError();
    case 403:
      return new ExternalAccessDeniedError(message);
    case 404:
      if (body?.code === RPC_CODE.methodNotFound) return new Error(message);
      return new MCPSessionExpiredError(message);
    case 429:
      return new RateLimitedError();
    default:
      return new Error(message);
  }
}

function stripMcpErrorPrefix(message: string): string {
  return message.replace(/^MCP error -?\d+:\s*/, "");
}

export function translateError(err: unknown): Error {
  if (err instanceof StreamableHTTPError) return translateHttpError(err);
  if (err instanceof McpError) {
    const message = stripMcpErrorPrefix(err.message);
    const byCode = errorForRpcCode(err.code, message);
    if (byCode) return byCode;
    const lowered = message.toLowerCase();
    if (lowered.includes("read-only") || lowered.includes("read only")) {
      return new ExternalAccessDeniedError(message);
    }
    return new Error(message);
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") return err;
    if (
      err.message.includes("fetch failed") ||
      err.message.includes("ECONNREFUSED")
    ) {
      return new MCPNotRunningError();
    }
    return err;
  }
  return new Error(String(err));
}

export function parseToolError(text: string | undefined): Error {
  const trimmed = text?.trim() ?? "";
  const match = /^([a-z_]+):\s*([\s\S]*)$/.exec(trimmed);
  if (match && KNOWN_TOOL_ERROR_CODES.has(match[1]!)) {
    const code = match[1]!;
    const message = match[2]!.trim() || code;
    if (code === "denied") return new ExternalAccessDeniedError(message);
    return new ToolError(code, message);
  }
  return new ToolError(
    undefined,
    trimmed || "TablePro could not run this request.",
  );
}
