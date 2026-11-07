import { isRecord } from "./domain";

export const requiredScopes = ["users.profile:write", "users:write", "dnd:write"];

const explanations: Record<string, string> = {
  invalid_auth: "Reconnect this workspace in Manage Workspaces.",
  token_revoked: "Reconnect this workspace in Manage Workspaces.",
  token_expired: "Reconnect this workspace in Manage Workspaces.",
  invalid_refresh_token: "Your connection expired. Reconnect this workspace.",
  missing_scope: "Reconnect with the required status, presence, and notification permissions.",
  not_allowed_token_type: "Connect your Slack user account, not a bot.",
  ratelimited: "Slack is rate limiting this workspace. Wait before retrying.",
  invalid_emoji: "Choose an emoji shortcode that exists in this workspace.",
  access_denied: "Slack denied access. Check your workspace's app policy.",
  invalid_client_id: "Check the Slack Client ID in extension preferences.",
};

export class SlackError extends Error {
  constructor(
    public readonly code: string,
    retryAfter?: string | null,
  ) {
    super(
      `${explanations[code] ?? `Slack returned ${code}.`}${retryAfter && /^\d+$/.test(retryAfter) ? ` Retry after ${retryAfter} seconds.` : ""}`,
    );
    this.name = "SlackError";
  }
}

export async function slackRequest(
  method: string,
  token: string | undefined,
  payload: Record<string, unknown> | URLSearchParams,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetcher(`https://slack.com/api/${method}`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type":
          payload instanceof URLSearchParams ? "application/x-www-form-urlencoded" : "application/json; charset=utf-8",
      },
      body: payload instanceof URLSearchParams ? payload.toString() : JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error(
      "Could not reach Slack. Check your connection and retry. A timed-out change may already have applied.",
    );
  }
  if (response.status === 429) throw new SlackError("ratelimited", response.headers.get("retry-after"));
  if (!response.ok) throw new Error(`Slack request failed (HTTP ${response.status}). Try again.`);
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Slack returned an unreadable response.");
  }
  if (!isRecord(data) || typeof data.ok !== "boolean") throw new Error("Slack returned an unexpected response.");
  if (!data.ok) {
    const code = typeof data.error === "string" && /^[a-z_]+$/.test(data.error) ? data.error : "unknown_error";
    throw new SlackError(code);
  }
  return data;
}

export interface UserTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
}

export function parseUserTokens(response: Record<string, unknown>): UserTokens {
  const user = isRecord(response.authed_user) ? response.authed_user : response;
  if (user.token_type !== "user" || typeof user.access_token !== "string" || !user.access_token) {
    throw new Error("Slack did not return a user token. Configure User Token Scopes, not Bot Token Scopes.");
  }
  if (
    user.expires_in !== undefined &&
    (typeof user.expires_in !== "number" || !Number.isFinite(user.expires_in) || user.expires_in <= 0)
  ) {
    throw new Error("Slack returned an invalid token expiration.");
  }
  if (user.expires_in !== undefined && (typeof user.refresh_token !== "string" || !user.refresh_token)) {
    throw new Error("Slack returned an expiring token without a refresh token. Reconnect this workspace.");
  }
  return {
    accessToken: user.access_token,
    refreshToken: typeof user.refresh_token === "string" ? user.refresh_token : undefined,
    expiresIn: typeof user.expires_in === "number" ? user.expires_in : undefined,
    scope: typeof user.scope === "string" ? user.scope : undefined,
  };
}

export function requireScopes(scope: string | undefined): void {
  const granted = new Set(scope?.split(/[ ,]+/));
  if (requiredScopes.some((value) => !granted.has(value))) throw new SlackError("missing_scope");
}

export function parseIdentity(data: Record<string, unknown>) {
  if (
    typeof data.team_id !== "string" ||
    !data.team_id ||
    typeof data.user_id !== "string" ||
    !data.user_id ||
    data.bot_id
  ) {
    throw new Error("Slack did not identify a workspace user. Connect a user account in a specific workspace.");
  }
  return {
    teamId: data.team_id,
    userId: data.user_id,
    teamName: typeof data.team === "string" && data.team ? data.team : data.team_id,
    userName: typeof data.user === "string" && data.user ? data.user : data.user_id,
  };
}
