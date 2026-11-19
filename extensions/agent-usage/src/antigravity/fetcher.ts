import { fetchAntigravityOauthUsage } from "./oauth.ts";
import { parseAntigravityCommandModelConfigsResponse, parseAntigravityUserStatusResponse } from "./parser.ts";
import {
  AntigravityProbeError,
  type AntigravityProbeResult,
  type AntigravityProbeSource,
  fetchAntigravityRawStatus,
} from "./probe.ts";
import type { AntigravityError, AntigravityUsage } from "./types.ts";

type ProbeFetcher = (preferredSource?: AntigravityProbeSource) => Promise<AntigravityProbeResult>;
type OauthUsageFetcher = () => Promise<{ usage: AntigravityUsage | null; error: AntigravityError | null } | null>;

export async function fetchAntigravityUsage(
  fetchRawStatus: ProbeFetcher = fetchAntigravityRawStatus,
  fetchOauthUsage: OauthUsageFetcher = fetchAntigravityOauthUsage,
): Promise<{
  usage: AntigravityUsage | null;
  error: AntigravityError | null;
}> {
  try {
    const probeResult = await fetchRawStatus();

    if (probeResult.source === "GetUserStatus") {
      const userStatusParsed = parseAntigravityUserStatusResponse(probeResult.payload, probeResult.quotaSummaryPayload);
      if (!userStatusParsed.error || userStatusParsed.error.type !== "parse_error") {
        return userStatusParsed;
      }

      const samePayloadFallback = parseAntigravityCommandModelConfigsResponse(probeResult.payload);
      if (!samePayloadFallback.error) {
        return samePayloadFallback;
      }

      try {
        const fallbackProbeResult = await fetchRawStatus("GetCommandModelConfigs");

        return fallbackProbeResult.source === "GetUserStatus"
          ? parseAntigravityUserStatusResponse(fallbackProbeResult.payload, fallbackProbeResult.quotaSummaryPayload)
          : parseAntigravityCommandModelConfigsResponse(fallbackProbeResult.payload);
      } catch {
        return userStatusParsed;
      }
    }

    return parseAntigravityCommandModelConfigsResponse(probeResult.payload);
  } catch (error) {
    if (shouldFallbackToOauth(error)) {
      try {
        const oauthResult = await fetchOauthUsage();
        if (oauthResult) {
          return oauthResult;
        }
      } catch {
        // Keep the original probe error when OAuth itself throws.
      }
    }

    return {
      usage: null,
      error: mapAntigravityError(error),
    };
  }
}

function shouldFallbackToOauth(error: unknown): boolean {
  return error instanceof AntigravityProbeError && (error.code === "not_running" || error.code === "missing_csrf");
}

export function mapAntigravityError(error: unknown): AntigravityError {
  if (error instanceof AntigravityProbeError) {
    switch (error.code) {
      case "not_running":
        return {
          type: "not_running",
          message: "Antigravity language server not detected. Launch Antigravity and retry.",
        };
      case "missing_csrf":
        return {
          type: "missing_csrf",
          message: "Antigravity CSRF token not found. Restart Antigravity and retry.",
        };
      case "port_detection_failed":
        return {
          type: "port_detection_failed",
          message: `Antigravity port detection failed: ${error.message}`,
        };
      case "api_error":
        return {
          type: "api_error",
          message: `Antigravity API error: ${error.message}`,
        };
      case "parse_error":
        return {
          type: "parse_error",
          message: error.message,
        };
      case "network_error":
        return {
          type: "network_error",
          message: error.message,
        };
      default:
        return {
          type: "unknown",
          message: error.message,
        };
    }
  }

  if (error instanceof Error) {
    return {
      type: "unknown",
      message: error.message,
    };
  }

  return {
    type: "unknown",
    message: "Unknown error while fetching Antigravity usage",
  };
}
