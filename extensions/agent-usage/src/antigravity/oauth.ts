import * as os from "node:os";

import { resolveAntigravityAccessToken } from "./auth.ts";
import { parseAntigravityQuotaSummaryResponse } from "./parser.ts";
import type { AntigravityError, AntigravityUsage } from "./types.ts";

const QUOTA_URL = "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary";
const DEFAULT_TIMEOUT_MS = 15_000;

export type AccessTokenResolver = () => Promise<string | null>;
export type JsonPoster = (
  url: string,
  accessToken: string,
  body: Record<string, unknown>,
  timeoutMs: number,
) => Promise<{ data: unknown; error: AntigravityError | null }>;

function antigravityUserAgent(): string {
  return `antigravity/1.11.3 ${os.type()}/${os.arch()}`;
}

async function postJson(
  url: string,
  accessToken: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ data: unknown; error: AntigravityError | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": antigravityUserAgent(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        data: null,
        error: {
          type: "api_error",
          message: `Antigravity Cloud Code API error: HTTP ${response.status}`,
        },
      };
    }

    return { data: await response.json(), error: null };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        data: null,
        error: { type: "network_error", message: "Antigravity Cloud Code request timed out" },
      };
    }

    return {
      data: null,
      error: {
        type: "network_error",
        message: error instanceof Error ? error.message : "Antigravity Cloud Code request failed",
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch Antigravity quota via stored Google OAuth credentials (no local language_server).
 * Returns null when no usable credentials are available (caller should keep the probe error).
 */
export async function fetchAntigravityOauthUsage(
  resolveAccessToken: AccessTokenResolver = resolveAntigravityAccessToken,
  post: JsonPoster = postJson,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ usage: AntigravityUsage | null; error: AntigravityError | null } | null> {
  const accessToken = await resolveAccessToken();
  if (!accessToken) {
    return null;
  }

  const { data, error } = await post(QUOTA_URL, accessToken, {}, timeoutMs);
  if (error) {
    return { usage: null, error };
  }

  return parseAntigravityQuotaSummaryResponse(data);
}
