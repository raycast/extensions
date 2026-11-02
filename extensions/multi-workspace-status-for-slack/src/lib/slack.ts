const REQUIRED_SCOPE = "users.profile:write";

export type Workspace = {
  teamId: string;
  name: string;
  user: string;
  token: string;
};

export type Status = {
  emoji: string;
  text: string;
  expiration: number;
};

export type StatusResult = {
  workspace: Workspace;
  error?: string;
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid_auth: "Invalid token",
  not_authed: "Token is missing",
  account_inactive: "Account is deactivated",
  token_revoked: "Token was revoked",
  token_expired: "Token expired",
  missing_scope: `Missing the ${REQUIRED_SCOPE} scope`,
  ratelimited: "Rate limit reached. Try again later",
  too_long: "Status text is too long",
  profile_status_set_failed_not_valid_emoji: "Emoji doesn't exist in this workspace",
  profile_status_set_failed_not_emoji_syntax: "Invalid emoji format",
  cannot_update_admin_user: "Slack doesn't allow status changes for this user",
};

export function describeError(code: string): string {
  return ERROR_MESSAGES[code] ?? code;
}

export function normalizeEmoji(input: string): string {
  const trimmed = input.trim().replace(/^:+|:+$/g, "");
  return trimmed ? `:${trimmed}:` : "";
}

async function callSlack(
  method: string,
  token: string,
  body: unknown,
): Promise<{ data: Record<string, unknown>; scopes: string | null }> {
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });
  if (response.status === 429) {
    throw new Error(describeError("ratelimited"));
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = (await response.json()) as Record<string, unknown>;
  if (data.ok !== true) {
    throw new Error(describeError(String(data.error ?? "unknown_error")));
  }
  return { data, scopes: response.headers.get("x-oauth-scopes") };
}

export async function verifyToken(rawToken: string): Promise<Workspace> {
  const token = rawToken.trim();
  if (!token.startsWith("xoxp-")) {
    throw new Error("Use a User OAuth Token (xoxp-…)");
  }
  const { data, scopes } = await callSlack("auth.test", token, {});
  if (
    scopes !== null &&
    !scopes
      .split(",")
      .map((scope) => scope.trim())
      .includes(REQUIRED_SCOPE)
  ) {
    throw new Error(describeError("missing_scope"));
  }
  return {
    teamId: String(data.team_id),
    name: String(data.team),
    user: String(data.user),
    token,
  };
}

export async function setStatus(workspaces: Workspace[], status: Status): Promise<StatusResult[]> {
  const profile = {
    status_emoji: status.emoji,
    status_text: status.text,
    status_expiration: status.expiration,
  };
  return Promise.all(
    workspaces.map(async (workspace) => {
      try {
        await callSlack("users.profile.set", workspace.token, { profile });
        return { workspace };
      } catch (error) {
        return { workspace, error: error instanceof Error ? error.message : String(error) };
      }
    }),
  );
}

export function clearStatus(workspaces: Workspace[]): Promise<StatusResult[]> {
  return setStatus(workspaces, { emoji: "", text: "", expiration: 0 });
}

export function summarize(results: StatusResult[]): string {
  return results
    .filter((result) => result.error)
    .map((result) => `${result.workspace.name}: ${result.error}`)
    .join("\n");
}
