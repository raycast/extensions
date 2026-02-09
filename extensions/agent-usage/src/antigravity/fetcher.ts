import { useCallback, useEffect, useState } from "react";
import { parseAntigravityCommandModelConfigsResponse, parseAntigravityUserStatusResponse } from "./parser";
import { AntigravityError, AntigravityUsage } from "./types";
import {
  AntigravityProbeError,
  AntigravityProbeResult,
  AntigravityProbeSource,
  fetchAntigravityRawStatus,
} from "./probe";

type ProbeFetcher = (preferredSource?: AntigravityProbeSource) => Promise<AntigravityProbeResult>;

export async function fetchAntigravityUsage(fetchRawStatus: ProbeFetcher = fetchAntigravityRawStatus): Promise<{
  usage: AntigravityUsage | null;
  error: AntigravityError | null;
}> {
  try {
    const probeResult = await fetchRawStatus();

    if (probeResult.source === "GetUserStatus") {
      const userStatusParsed = parseAntigravityUserStatusResponse(probeResult.payload);
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
          ? parseAntigravityUserStatusResponse(fallbackProbeResult.payload)
          : parseAntigravityCommandModelConfigsResponse(fallbackProbeResult.payload);
      } catch {
        return userStatusParsed;
      }
    }

    return parseAntigravityCommandModelConfigsResponse(probeResult.payload);
  } catch (error) {
    return {
      usage: null,
      error: mapAntigravityError(error),
    };
  }
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

export function useAntigravityUsage() {
  const [usage, setUsage] = useState<AntigravityUsage | null>(null);
  const [error, setError] = useState<AntigravityError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasInitialFetch, setHasInitialFetch] = useState<boolean>(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchAntigravityUsage();

    setUsage(result.usage);
    setError(result.error);
    setIsLoading(false);
    setHasInitialFetch(true);
  }, []);

  useEffect(() => {
    if (!hasInitialFetch) {
      fetchData();
    }
  }, [hasInitialFetch, fetchData]);

  const revalidate = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return {
    isLoading,
    usage,
    error,
    revalidate,
  };
}
