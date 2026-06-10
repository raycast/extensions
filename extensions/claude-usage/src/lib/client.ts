import { Cache, getPreferenceValues } from "@raycast/api";
import type { ClaudeUsage, UsageWindow } from "./types";
import { getAuth, KeychainError, subscriptionLabel } from "./keychain";

/** Same usage endpoint the Claude Code CLI uses for its own limit display. */
const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const cache = new Cache({ namespace: "claude-usage" });

const USAGE_CACHE_KEY = "usage";
/** Serve a cached snapshot if it is younger than this (ms). Keeps menu bar + dashboard from double-fetching. */
const USAGE_TTL = 45_000;

interface Prefs {
  menuBarStyle: string;
  showOpus: boolean;
}

export function getPrefs(): Prefs {
  return getPreferenceValues<Prefs>();
}

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }
}

function headers(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    // Identify as Claude Code so the OAuth token is accepted by the usage endpoint.
    "anthropic-beta": "oauth-2025-04-20",
    "User-Agent": "claude-code/2.1.72",
    Accept: "application/json",
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseWindow(raw: any): UsageWindow | null {
  if (!raw || typeof raw !== "object") return null;
  const utilization =
    typeof raw.utilization === "number" ? raw.utilization : raw.utilization_pct;
  if (typeof utilization !== "number") return null;
  return {
    utilization: Math.max(0, Math.min(100, utilization)),
    resetsAt:
      typeof raw.resets_at === "string"
        ? raw.resets_at
        : (raw.reset_at ?? null),
  };
}

export async function fetchUsage(options?: {
  force?: boolean;
}): Promise<ClaudeUsage> {
  if (!options?.force) {
    const cached = cache.get(USAGE_CACHE_KEY);
    if (cached) {
      try {
        const snap = JSON.parse(cached) as ClaudeUsage;
        if (Date.now() - snap.fetchedAt < USAGE_TTL) return snap;
      } catch {
        /* refetch */
      }
    }
  }

  let auth;
  try {
    auth = await getAuth();
  } catch (e) {
    const msg =
      e instanceof KeychainError
        ? e.message
        : `Auth error: ${e instanceof Error ? e.message : String(e)}`;
    throw new ClaudeApiError(msg, 401);
  }

  let res: Response;
  try {
    res = await fetch(USAGE_URL, { headers: headers(auth.accessToken) });
  } catch (e) {
    throw new ClaudeApiError(
      `Network error: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new ClaudeApiError(
        "Claude Code session expired or invalid — use Claude Code (or re-login) to refresh it.",
        res.status,
      );
    }
    if (res.status === 429) {
      throw new ClaudeApiError(
        "Rate limited by the API — try again in a moment.",
        429,
      );
    }
    throw new ClaudeApiError(
      `Usage endpoint responded with HTTP ${res.status}`,
      res.status,
    );
  }

  const text = await res.text();
  let raw: any;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ClaudeApiError(
      "Unexpected non-JSON response from the usage endpoint.",
    );
  }

  const extra = raw?.extra_usage;
  const usage: ClaudeUsage = {
    fiveHour: parseWindow(raw?.five_hour),
    sevenDay: parseWindow(raw?.seven_day),
    sevenDayOpus: parseWindow(raw?.seven_day_opus),
    sevenDaySonnet: parseWindow(raw?.seven_day_sonnet),
    extraUsage:
      extra && typeof extra === "object"
        ? {
            isEnabled: Boolean(extra.is_enabled),
            monthlyLimit:
              typeof extra.monthly_limit === "number"
                ? extra.monthly_limit
                : null,
            usedCredits:
              typeof extra.used_credits === "number"
                ? extra.used_credits
                : null,
            utilization:
              typeof extra.utilization === "number" ? extra.utilization : null,
          }
        : null,
    fetchedAt: Date.now(),
    orgName: subscriptionLabel(auth.subscriptionType),
  };

  cache.set(USAGE_CACHE_KEY, JSON.stringify(usage));
  return usage;
}

/** Last cached snapshot regardless of age — used to render something while a refresh fails. */
export function getCachedUsage(): ClaudeUsage | null {
  const cached = cache.get(USAGE_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as ClaudeUsage;
  } catch {
    return null;
  }
}
