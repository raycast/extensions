import type { PlanInfo, Usage, UsageWindow } from "../types";
import { CredentialsError, readCredentials } from "./credentials";

export const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
export const USAGE_PAGE = "https://claude.ai/settings/usage";

export type UsageErrorKind = "unauthorized" | "rate_limited" | "server" | "network" | "schema";

export class UsageError extends Error {
  constructor(
    public kind: UsageErrorKind,
    public status?: number,
    public retryAfterSec?: number,
  ) {
    super(kind);
    this.name = "UsageError";
  }
}

export interface UsageSource {
  id: string;
  load(signal?: AbortSignal): Promise<{ usage: Usage; plan?: PlanInfo }>;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export async function fetchUsage(token: string, signal?: AbortSignal, fetchImpl: FetchLike = fetch): Promise<Usage> {
  let res: Response;
  try {
    res = await fetchImpl(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": "claude-usage-ring/1.0",
      },
      signal: signal ?? AbortSignal.timeout(10_000),
    });
  } catch {
    throw new UsageError("network");
  }

  if (res.status === 401 || res.status === 403) throw new UsageError("unauthorized", res.status);
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after"));
    throw new UsageError("rate_limited", 429, Number.isFinite(ra) && ra > 0 ? ra : undefined);
  }
  if (!res.ok) throw new UsageError("server", res.status);

  let j: unknown;
  try {
    j = await res.json();
  } catch {
    throw new UsageError("schema", res.status);
  }
  return parseUsage(j);
}

export function parseUsage(j: unknown, now = Date.now()): Usage {
  if (!j || typeof j !== "object" || (!("five_hour" in j) && !("seven_day" in j))) {
    throw new UsageError("schema");
  }
  const o = j as Record<string, unknown>;
  return {
    fiveHour: parseWindow(o.five_hour),
    sevenDay: parseWindow(o.seven_day),
    sevenDayOpus: parseWindow(o.seven_day_opus),
    sevenDaySonnet: parseWindow(o.seven_day_sonnet),
    fetchedAt: now,
  };
}

export function parseWindow(w: unknown): UsageWindow | null {
  if (!w || typeof w !== "object") return null;
  const o = w as Record<string, unknown>;
  if (typeof o.utilization !== "number" || !Number.isFinite(o.utilization)) return null;
  let resetsAt: string | null = null;
  if (typeof o.resets_at === "string") {
    const d = new Date(o.resets_at);
    if (!Number.isNaN(d.getTime())) resetsAt = d.toISOString();
  }
  return {
    utilization: Math.max(0, Math.min(100, o.utilization)),
    resetsAt,
    lockedReason: typeof o.locked_reason === "string" && o.locked_reason ? o.locked_reason : null,
  };
}

export function oauthSource(credentialsSource: "keychain" | "file", fetchImpl?: FetchLike): UsageSource {
  return {
    id: "oauth",
    async load(signal) {
      const creds = await readCredentials(credentialsSource);
      const plan = { subscriptionType: creds.subscriptionType, rateLimitTier: creds.rateLimitTier };
      if (creds.expiresAt && creds.expiresAt < Date.now()) {
        throw new CredentialsError("expired", "OAuth token expired");
      }
      const usage = await fetchUsage(creds.accessToken, signal, fetchImpl);
      return { usage, plan };
    },
  };
}
