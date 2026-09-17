export interface ClaudeOAuthCredential {
  accessToken: string;
  expiresAt?: number;
  scopes: string[];
}

export class ClaudeOAuthCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeOAuthCredentialError";
  }
}

export function parseClaudeOAuthCredential(
  serialized: string,
  now = Date.now(),
): ClaudeOAuthCredential {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    throw new ClaudeOAuthCredentialError(
      "Claude Code OAuth Credentials Are Invalid",
    );
  }
  if (!isObject(value) || !isObject(value.claudeAiOauth)) {
    throw new ClaudeOAuthCredentialError(
      "Claude Code Is Not Signed In with a Subscription Account",
    );
  }
  const oauth = value.claudeAiOauth;
  const accessToken =
    typeof oauth.accessToken === "string" ? oauth.accessToken.trim() : "";
  if (!accessToken || accessToken.length > 10_000 || /\s/.test(accessToken)) {
    throw new ClaudeOAuthCredentialError(
      "Claude Code OAuth Credentials Are Missing an Access Token",
    );
  }
  const scopes = Array.isArray(oauth.scopes)
    ? oauth.scopes.filter(
        (scope): scope is string =>
          typeof scope === "string" && scope.length > 0 && scope.length <= 200,
      )
    : [];
  if (!scopes.includes("user:profile")) {
    throw new ClaudeOAuthCredentialError(
      "Claude Code Is Using an Inference-Only Token. Run 'claude auth login' to Restore Subscription Usage Access",
    );
  }
  const expiresAt =
    typeof oauth.expiresAt === "number" && Number.isFinite(oauth.expiresAt)
      ? oauth.expiresAt
      : undefined;
  if (expiresAt !== undefined && expiresAt <= now) {
    throw new ClaudeOAuthCredentialError(
      "Claude Code OAuth Credentials Have Expired. Run 'claude auth login'",
    );
  }
  return { accessToken, expiresAt, scopes };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
