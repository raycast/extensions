import { createSimpleHook } from "../agents/hooks";
import {
  applyGrokRefreshedTokens,
  getGrokDisplayName,
  getGrokLoginMethod,
  loadGrokCredentials,
  needsGrokTokenRefresh,
  persistGrokRefreshedTokens,
  refreshGrokAccessToken,
  type GrokCredentials,
} from "./auth";
import { grpcWebTrailerFields, parseGrokWebBillingResponse, primaryWindowLabel } from "./parser";
import type { GrokError, GrokUsage } from "./types";

const GROK_BILLING_URL = "https://grok.com/grok_api_v2.GrokBuildBilling/GetGrokCreditsConfig";
const REQUEST_TIMEOUT_MS = 15000;

/** Empty gRPC-web frame: flags=0, length=0 (empty protobuf message). */
const EMPTY_GRPC_WEB_BODY = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00]);

/** gRPC status codes that map to session/auth failures. */
const GRPC_UNAUTHENTICATED = 16;
const GRPC_PERMISSION_DENIED = 7;

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

function buildUsage(credentials: GrokCredentials, usedPercent: number, resetsAt: Date | null): GrokUsage {
  const used = clampPercent(usedPercent);
  return {
    usedPercent: used,
    percentageRemaining: clampPercent(100 - used),
    resetsAt: resetsAt ? resetsAt.toISOString() : null,
    windowLabel: primaryWindowLabel(resetsAt),
    accountEmail: credentials.email,
    accountName: getGrokDisplayName(credentials),
    teamId: credentials.teamId,
    loginMethod: getGrokLoginMethod(credentials),
    source: "auth.json",
  };
}

function parseGrpcStatus(
  rawStatus: string | null | undefined,
  message: string,
): { status: number; message: string } | null {
  if (rawStatus === null || rawStatus === undefined || rawStatus === "") return null;
  const status = Number(rawStatus);
  if (!Number.isFinite(status)) return null;
  return { status, message };
}

function grpcStatusFromHeaders(headers: Headers): { status: number; message: string } | null {
  return parseGrpcStatus(headers.get("grpc-status"), headers.get("grpc-message") ?? "");
}

/** Auth/status errors often arrive in the gRPC-web trailer frame rather than HTTP headers. */
function grpcStatusFromBody(buffer: Uint8Array): { status: number; message: string } | null {
  const fields = grpcWebTrailerFields(buffer);
  return parseGrpcStatus(fields["grpc-status"], fields["grpc-message"] ?? "");
}

function errorFromGrpcStatus(status: number, message: string): GrokError {
  if (status === GRPC_UNAUTHENTICATED || status === GRPC_PERMISSION_DENIED) {
    return {
      type: "unauthorized",
      message: message
        ? `Grok session rejected (${status}): ${message}`
        : "Grok session expired or invalid. Run `grok login` to refresh credentials.",
    };
  }
  return {
    type: "unknown",
    message: message ? `gRPC status ${status}: ${message}` : `gRPC status ${status}`,
  };
}

async function fetchGrokWebBilling(accessToken: string): Promise<{
  usage: GrokUsage | null;
  error: GrokError | null;
  snapshot?: { usedPercent: number; resetsAt: Date | null };
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(GROK_BILLING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "*/*",
        "Content-Type": "application/grpc-web+proto",
        "x-grpc-web": "1",
        "x-user-agent": "connect-es/2.1.1",
        Origin: "https://grok.com",
        Referer: "https://grok.com/?_s=usage",
        "User-Agent": "AgentUsage/1.0",
      },
      body: EMPTY_GRPC_WEB_BODY,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.status === 401 || response.status === 403) {
      return {
        usage: null,
        error: {
          type: "unauthorized",
          message: "Grok session expired or invalid. Run `grok login` to refresh credentials.",
        },
      };
    }

    if (!response.ok) {
      return {
        usage: null,
        error: {
          type: "unknown",
          message: `Grok billing request failed with HTTP ${response.status}: ${response.statusText}`,
        },
      };
    }

    const headerStatus = grpcStatusFromHeaders(response.headers);
    if (headerStatus && headerStatus.status !== 0) {
      return {
        usage: null,
        error: errorFromGrpcStatus(headerStatus.status, headerStatus.message),
      };
    }

    const buffer = new Uint8Array(await response.arrayBuffer());

    // Trailer-based failures (common for gRPC-web) must map to unauthorized so refresh/retry runs.
    const bodyStatus = grpcStatusFromBody(buffer);
    if (bodyStatus && bodyStatus.status !== 0) {
      return {
        usage: null,
        error: errorFromGrpcStatus(bodyStatus.status, bodyStatus.message),
      };
    }

    try {
      const snapshot = parseGrokWebBillingResponse(buffer);
      return { usage: null, error: null, snapshot };
    } catch (error) {
      return {
        usage: null,
        error: {
          type: "parse_error",
          message: error instanceof Error ? error.message : "Could not parse Grok web billing usage",
        },
      };
    }
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        usage: null,
        error: { type: "network_error", message: "Request timeout. Please check your network connection." },
      };
    }
    return {
      usage: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Network request failed",
      },
    };
  }
}

async function ensureFreshCredentials(credentials: GrokCredentials): Promise<GrokCredentials> {
  if (!needsGrokTokenRefresh(credentials) || !credentials.refreshToken) {
    return credentials;
  }

  const refreshed = await refreshGrokAccessToken(credentials);
  if (!refreshed) return credentials;

  persistGrokRefreshedTokens(credentials, refreshed);
  return applyGrokRefreshedTokens(credentials, refreshed);
}

async function refreshAfterUnauthorized(credentials: GrokCredentials): Promise<GrokCredentials | null> {
  if (!credentials.refreshToken) return null;
  const refreshed = await refreshGrokAccessToken(credentials);
  if (!refreshed) return null;
  persistGrokRefreshedTokens(credentials, refreshed);
  return applyGrokRefreshedTokens(credentials, refreshed);
}

export async function fetchGrokUsage(): Promise<{ usage: GrokUsage | null; error: GrokError | null }> {
  let credentials = loadGrokCredentials();
  if (!credentials) {
    return {
      usage: null,
      error: {
        type: "not_configured",
        message: "Grok is not configured. Run `grok login` (reads ~/.grok/auth.json).",
      },
    };
  }

  // Proactive refresh when near/past expiry; still attempt billing if refresh fails.
  credentials = await ensureFreshCredentials(credentials);

  let result = await fetchGrokWebBilling(credentials.accessToken);

  if (result.error?.type === "unauthorized") {
    const retried = await refreshAfterUnauthorized(credentials);
    if (retried) {
      credentials = retried;
      result = await fetchGrokWebBilling(credentials.accessToken);
    }
  }

  if (result.error || !result.snapshot) {
    return {
      usage: null,
      error: result.error ?? { type: "unknown", message: "Failed to fetch Grok usage" },
    };
  }

  return {
    usage: buildUsage(credentials, result.snapshot.usedPercent, result.snapshot.resetsAt),
    error: null,
  };
}

export const useGrokUsage = createSimpleHook<GrokUsage, GrokError>({ fetcher: fetchGrokUsage });
