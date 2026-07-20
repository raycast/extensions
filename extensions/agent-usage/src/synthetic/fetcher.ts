import { SyntheticUsage, SyntheticError } from "./types";
import { httpFetch } from "../agents/http";

export const SYNTHETIC_OPENCODE_KEY = "synthetic";

const SYNTHETIC_QUOTAS_API = "https://api.synthetic.new/v2/quotas";

interface QuotaBucketResponse {
  limit?: number;
  requests?: number;
  renewsAt?: string;
}

interface SyntheticApiResponse {
  subscription?: QuotaBucketResponse;
  search?: {
    hourly?: QuotaBucketResponse;
  };
  freeToolCalls?: QuotaBucketResponse;
}

function validateQuotaBucket(
  bucket: QuotaBucketResponse | undefined,
): bucket is { limit: number; requests: number; renewsAt: string } {
  return (
    !!bucket &&
    typeof bucket.limit === "number" &&
    typeof bucket.requests === "number" &&
    typeof bucket.renewsAt === "string"
  );
}

function parseSyntheticResponse(data: unknown): { usage: SyntheticUsage | null; error: SyntheticError | null } {
  try {
    if (!data || typeof data !== "object") {
      return { usage: null, error: { type: "parse_error", message: "Invalid API response format" } };
    }

    const response = data as SyntheticApiResponse;

    if (!validateQuotaBucket(response.subscription)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid subscription data from Synthetic API" },
      };
    }

    if (!response.search?.hourly || !validateQuotaBucket(response.search.hourly)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid search hourly data from Synthetic API" },
      };
    }

    if (!validateQuotaBucket(response.freeToolCalls)) {
      return {
        usage: null,
        error: { type: "parse_error", message: "Missing or invalid free tool calls data from Synthetic API" },
      };
    }

    return {
      usage: {
        subscription: response.subscription,
        search: {
          hourly: response.search.hourly,
        },
        freeToolCalls: response.freeToolCalls,
      },
      error: null,
    };
  } catch (err) {
    return {
      usage: null,
      error: {
        type: "parse_error",
        message: err instanceof Error ? err.message : "Failed to parse API response",
      },
    };
  }
}

export async function fetchSyntheticUsage(
  token: string,
): Promise<{ usage: SyntheticUsage | null; error: SyntheticError | null }> {
  const { data, error } = await httpFetch({
    url: SYNTHETIC_QUOTAS_API,
    method: "GET",
    token,
    headers: { Accept: "application/json" },
  });
  if (error) return { usage: null, error };
  return parseSyntheticResponse(data);
}
