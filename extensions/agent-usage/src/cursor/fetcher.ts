import { getPreferenceValues } from "@raycast/api";
import { createSimpleHook } from "../agents/hooks";
import { httpFetch } from "../agents/http";
import { resolveCursorAppAuthSession } from "./auth";
import { parseCursorUsage } from "./parser";
import type { CursorRequestUsageResponse, CursorUsageSummary, CursorUserInfo } from "./parser";
import type { CursorError, CursorUsage } from "./types";

type Preferences = Preferences.AgentUsage;

const CURSOR_BASE_URL = "https://cursor.com";
const CURSOR_HEADERS = {
  Accept: "application/json",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

interface CursorCredential {
  cookieHeader: string;
  source: string;
  requestUsageUserIdFallback: string | null;
}

function normalizeCookieHeader(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function fetchCursorJson<T>(
  path: string,
  cookieHeader: string,
  query?: URLSearchParams,
): Promise<{ data: T | null; error: CursorError | null }> {
  const url = `${CURSOR_BASE_URL}${path}${query ? `?${query.toString()}` : ""}`;
  const { data, error } = await httpFetch({
    url,
    headers: { ...CURSOR_HEADERS, Cookie: cookieHeader },
    unauthorizedMessage: "Cursor session expired or invalid. Open Cursor, sign in again, or paste a Cookie header.",
  });

  if (error) {
    return { data: null, error: error.type === "unauthorized" ? error : { type: error.type, message: error.message } };
  }

  return { data: data as T, error: null };
}

function resolveCursorCredential(): CursorCredential | null {
  const preferences = getPreferenceValues<Preferences>();
  const manualCookie = normalizeCookieHeader(preferences.cursorCookieHeader);
  if (manualCookie) {
    return { cookieHeader: manualCookie, source: "manual cookie", requestUsageUserIdFallback: null };
  }

  const appSession = resolveCursorAppAuthSession();
  return appSession
    ? { cookieHeader: appSession.cookieHeader, source: "Cursor.app", requestUsageUserIdFallback: appSession.userId }
    : null;
}

export async function fetchCursorUsage(): Promise<{ usage: CursorUsage | null; error: CursorError | null }> {
  const credential = resolveCursorCredential();
  if (!credential) {
    return {
      usage: null,
      error: {
        type: "not_configured",
        message:
          "Cursor is not configured. Sign in to Cursor.app, or paste a cursor.com Cookie header in extension settings.",
      },
    };
  }

  const [summaryResult, userResult] = await Promise.all([
    fetchCursorJson<CursorUsageSummary>("/api/usage-summary", credential.cookieHeader),
    fetchCursorJson<CursorUserInfo>("/api/auth/me", credential.cookieHeader),
  ]);

  if (summaryResult.error || !summaryResult.data) {
    return { usage: null, error: summaryResult.error ?? { type: "parse_error", message: "Missing usage summary" } };
  }

  const userInfo = userResult.data;
  const userId = userInfo?.sub ?? credential.requestUsageUserIdFallback;
  const requestUsage = userId
    ? (
        await fetchCursorJson<CursorRequestUsageResponse>(
          "/api/usage",
          credential.cookieHeader,
          new URLSearchParams({ user: userId }),
        )
      ).data
    : null;

  try {
    return {
      usage: parseCursorUsage(summaryResult.data, userInfo, requestUsage, credential.source),
      error: null,
    };
  } catch (error) {
    return {
      usage: null,
      error: { type: "parse_error", message: error instanceof Error ? error.message : "Failed to parse Cursor usage" },
    };
  }
}

export const useCursorUsage = createSimpleHook<CursorUsage, CursorError>({ fetcher: fetchCursorUsage });
