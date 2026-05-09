import type { OAuthCredentials } from "@mariozechner/pi-ai/oauth";

export const OAUTH_STORAGE_KEY = "openai-codex-oauth-credentials";
export const OAUTH_ENV_KEY = "RAYCAST_CHATGPT_OAUTH_CREDENTIALS";

export type StoredCredentials = OAuthCredentials & {
  type: "oauth";
  provider: "openai-codex";
  email?: string;
};

export function serializeCredentials(credentials: StoredCredentials): string {
  return JSON.stringify(credentials);
}

export function parseCredentials(raw: string): StoredCredentials {
  const parsed = JSON.parse(raw) as StoredCredentials;
  if (
    !parsed ||
    parsed.type !== "oauth" ||
    parsed.provider !== "openai-codex"
  ) {
    throw new Error(
      "Stored credentials are not OpenAI Codex OAuth credentials.",
    );
  }
  return parsed;
}
