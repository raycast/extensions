import * as os from "node:os";

import { resolveAntigravityAccessToken } from "./auth.ts";
import {
  extractAntigravityPlanFromLoadCodeAssist,
  extractEmailFromUserInfo,
  parseAntigravityQuotaSummaryResponse,
} from "./parser.ts";
import type { AntigravityError, AntigravityUsage } from "./types.ts";

const QUOTA_URL = "https://daily-cloudcode-pa.googleapis.com/v1internal:retrieveUserQuotaSummary";
const LOAD_CODE_ASSIST_URL = "https://daily-cloudcode-pa.googleapis.com/v1internal:loadCodeAssist";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const DEFAULT_TIMEOUT_MS = 15_000;

export type AccessTokenResolver = () => Promise<string | null>;
export type JsonPoster = (
  url: string,
  accessToken: string,
  body: Record<string, unknown>,
  timeoutMs: number,
) => Promise<{ data: unknown; error: AntigravityError | null }>;
export type JsonGetter = (
  url: string,
  accessToken: string,
  timeoutMs: number,
) => Promise<{ data: unknown; error: AntigravityError | null }>;

function antigravityUserAgent(): string {
  return `antigravity/1.11.3 ${os.type()}/${os.arch()}`;
}

async function requestJson(
  url: string,
  accessToken: string,
  timeoutMs: number,
  init: { method: "GET" | "POST"; body?: Record<string, unknown> },
): Promise<{ data: unknown; error: AntigravityError | null }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": antigravityUserAgent(),
        ...(init.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: init.method === "POST" ? JSON.stringify(init.body ?? {}) : undefined,
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

async function postJson(
  url: string,
  accessToken: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ data: unknown; error: AntigravityError | null }> {
  return requestJson(url, accessToken, timeoutMs, { method: "POST", body });
}

async function getJson(
  url: string,
  accessToken: string,
  timeoutMs: number,
): Promise<{ data: unknown; error: AntigravityError | null }> {
  return requestJson(url, accessToken, timeoutMs, { method: "GET" });
}

/**
 * Fetch Antigravity quota via stored Google OAuth credentials (no local language_server).
 * Returns null when no usable credentials are available (caller should keep the probe error).
 */
export async function fetchAntigravityOauthUsage(
  resolveAccessToken: AccessTokenResolver = resolveAntigravityAccessToken,
  post: JsonPoster = postJson,
  get: JsonGetter = getJson,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ usage: AntigravityUsage | null; error: AntigravityError | null } | null> {
  const accessToken = await resolveAccessToken();
  if (!accessToken) {
    return null;
  }

  const [quotaResult, assistResult, userInfoResult] = await Promise.all([
    post(QUOTA_URL, accessToken, {}, timeoutMs),
    post(LOAD_CODE_ASSIST_URL, accessToken, {}, timeoutMs),
    get(USERINFO_URL, accessToken, timeoutMs),
  ]);

  if (quotaResult.error) {
    return { usage: null, error: quotaResult.error };
  }

  return parseAntigravityQuotaSummaryResponse(quotaResult.data, {
    email: userInfoResult.error ? null : extractEmailFromUserInfo(userInfoResult.data),
    plan: assistResult.error ? null : extractAntigravityPlanFromLoadCodeAssist(assistResult.data),
  });
}
