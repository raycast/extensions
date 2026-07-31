/**
 * Reads the real rate-limit utilization from Anthropic's OAuth usage endpoint,
 * the same source Claude Code's own `/usage` uses.
 *
 * Auth: macOS Keychain item "Claude Code-credentials" (or the hashed variant
 * when CLAUDE_CONFIG_DIR is set), falling back to ~/.claude/.credentials.json.
 * Expired access tokens are refreshed with the stored refresh token.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import https from "node:https";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { LimitWindow, RateLimits } from "./types";

const OAUTH_CLIENT_ID =
  process.env.CLAUDE_CODE_OAUTH_CLIENT_ID ||
  "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
const TIMEOUT_MS = 10_000;

export class UsageApiError extends Error {
  constructor(
    message: string,
    readonly reason:
      | "no-credentials"
      | "unauthorized"
      | "rate-limited"
      | "network"
      | "bad-response",
  ) {
    super(message);
    this.name = "UsageApiError";
  }
}

interface Credentials {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  subscriptionType?: string;
  rateLimitTier?: string;
}

function keychainServiceName(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR;
  if (configDir) {
    // Claude Code hashes the raw env value, not the expanded path.
    const hash = createHash("sha256")
      .update(configDir)
      .digest("hex")
      .slice(0, 8);
    return `Claude Code-credentials-${hash}`;
  }
  return "Claude Code-credentials";
}

function normalize(raw: unknown): Credentials | null {
  if (typeof raw !== "object" || raw === null) return null;
  const outer = raw as Record<string, unknown>;
  const inner =
    (outer.claudeAiOauth as Record<string, unknown> | undefined) ?? outer;
  const accessToken = inner.accessToken;
  if (typeof accessToken !== "string" || accessToken.length === 0) return null;
  return {
    accessToken,
    refreshToken:
      typeof inner.refreshToken === "string" ? inner.refreshToken : undefined,
    expiresAt:
      typeof inner.expiresAt === "number" ? inner.expiresAt : undefined,
    subscriptionType:
      typeof inner.subscriptionType === "string"
        ? inner.subscriptionType
        : undefined,
    rateLimitTier:
      typeof inner.rateLimitTier === "string" ? inner.rateLimitTier : undefined,
  };
}

function readKeychain(): Credentials | null {
  if (process.platform !== "darwin") return null;
  const service = keychainServiceName();
  let username: string | undefined;
  try {
    username = userInfo().username?.trim() || undefined;
  } catch {
    username = undefined;
  }
  for (const account of [username, undefined]) {
    const args = account
      ? ["find-generic-password", "-s", service, "-a", account, "-w"]
      : ["find-generic-password", "-s", service, "-w"];
    try {
      const out = execFileSync("/usr/bin/security", args, {
        encoding: "utf8",
        timeout: 3000,
        stdio: ["pipe", "pipe", "pipe"],
      }).trim();
      if (!out) continue;
      const creds = normalize(JSON.parse(out));
      if (creds) return creds;
    } catch {
      // Try the next account shape.
    }
  }
  return null;
}

function readCredentialsFile(): Credentials | null {
  const dir =
    process.env.CLAUDE_CONFIG_DIR?.replace(/^~(?=$|\/)/, homedir()) ??
    join(homedir(), ".claude");
  const path = join(dir, ".credentials.json");
  if (!existsSync(path)) return null;
  try {
    return normalize(JSON.parse(readFileSync(path, "utf8")));
  } catch {
    return null;
  }
}

export function readCredentials(): Credentials | null {
  return readKeychain() ?? readCredentialsFile();
}

function refreshToken(token: string): Promise<Credentials | null> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: token,
    client_id: OAUTH_CLIENT_ID,
  }).toString();

  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: "platform.claude.com",
        path: "/v1/oauth/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": Buffer.byteLength(body),
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          if (res.statusCode !== 200) return resolve(null);
          try {
            const p = JSON.parse(data);
            if (typeof p.access_token !== "string") return resolve(null);
            resolve({
              accessToken: p.access_token,
              refreshToken:
                typeof p.refresh_token === "string" ? p.refresh_token : token,
              expiresAt:
                typeof p.expires_in === "number"
                  ? Date.now() + p.expires_in * 1000
                  : p.expires_at,
            });
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end(body);
  });
}

interface ApiWindow {
  utilization?: number | null;
  resets_at?: string | null;
}

interface ApiLimit {
  kind?: string;
  group?: string;
  percent?: number;
  severity?: string;
  resets_at?: string | null;
  is_active?: boolean;
}

interface ApiResponse {
  five_hour?: ApiWindow | null;
  seven_day?: ApiWindow | null;
  seven_day_opus?: ApiWindow | null;
  seven_day_sonnet?: ApiWindow | null;
  limits?: ApiLimit[];
}

function toWindow(w: ApiWindow | null | undefined): LimitWindow | null {
  if (!w || typeof w.utilization !== "number") return null;
  const resets = w.resets_at ? Date.parse(w.resets_at) : NaN;
  return {
    utilization: w.utilization,
    resetsAt: Number.isFinite(resets) ? resets : null,
  };
}

function request(
  accessToken: string,
): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.anthropic.com",
        path: "/api/oauth/usage",
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "anthropic-beta": "oauth-2025-04-20",
          "Content-Type": "application/json",
        },
        timeout: TIMEOUT_MS,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, body: data }),
        );
      },
    );
    req.on("error", (e) => reject(new UsageApiError(e.message, "network")));
    req.on("timeout", () => {
      req.destroy();
      reject(new UsageApiError("Usage API timed out", "network"));
    });
    req.end();
  });
}

export async function fetchRateLimits(): Promise<RateLimits> {
  let creds = readCredentials();
  if (!creds) {
    throw new UsageApiError(
      "No Claude Code credentials found. Run `claude` and sign in first.",
      "no-credentials",
    );
  }

  const expired = creds.expiresAt != null && creds.expiresAt <= Date.now();
  if (expired && creds.refreshToken) {
    const refreshed = await refreshToken(creds.refreshToken);
    if (refreshed) creds = { ...creds, ...refreshed };
  }

  let res = await request(creds.accessToken);
  if (res.status === 401 && creds.refreshToken) {
    const refreshed = await refreshToken(creds.refreshToken);
    if (refreshed) {
      creds = { ...creds, ...refreshed };
      res = await request(creds.accessToken);
    }
  }

  if (res.status === 429)
    throw new UsageApiError("Usage API rate limited", "rate-limited");
  if (res.status === 401 || res.status === 403) {
    throw new UsageApiError(
      "Claude Code credentials rejected. Sign in again with `claude`.",
      "unauthorized",
    );
  }
  if (res.status !== 200)
    throw new UsageApiError(
      `Usage API returned HTTP ${res.status}`,
      "bad-response",
    );

  let parsed: ApiResponse;
  try {
    parsed = JSON.parse(res.body);
  } catch {
    throw new UsageApiError(
      "Usage API returned unparseable JSON",
      "bad-response",
    );
  }

  const weeklyLimit =
    parsed.limits?.find((l) => l.kind === "weekly_all") ?? null;

  return {
    fiveHour: toWindow(parsed.five_hour),
    weekly: toWindow(parsed.seven_day),
    weeklyOpus: toWindow(parsed.seven_day_opus),
    weeklySonnet: toWindow(parsed.seven_day_sonnet),
    weeklySeverity: weeklyLimit?.severity ?? null,
    subscriptionType: creds.subscriptionType ?? null,
    rateLimitTier: creds.rateLimitTier ?? null,
    fetchedAt: Date.now(),
  };
}
