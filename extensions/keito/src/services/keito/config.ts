import { KeitoError } from "./errors";

export const KEITO_API_BASE_URL = "https://app.keito.ai/api/v2";
export const KEITO_WEB_URL = "https://app.keito.ai";
export const KEITO_API_KEYS_DOCS_URL = "https://keito.ai/docs/auth/api-keys";

export interface KeitoCredentials {
  token: string;
  accountId: string;
}

/**
 * Validate the preference values locally before any request is made.
 * Error messages never echo the submitted values.
 */
export function validateCredentials(input: { token?: string; accountID?: string }): KeitoCredentials {
  const token = (input.token ?? "").trim();
  const accountId = (input.accountID ?? "").trim();

  if (!token || !accountId) {
    throw new KeitoError(
      "missing_credentials",
      "Enter a Keito full-access integration key and your Company ID in the extension preferences. Both are shown in Keito under Settings → API & Developers.",
    );
  }
  if (accountId.startsWith("kto_")) {
    throw new KeitoError(
      "malformed_credentials",
      "The Company ID field contains an API key. Put the kto_… key in Keito Integration API Key and the Company ID in Keito Company ID.",
    );
  }
  if (!token.startsWith("kto_")) {
    throw new KeitoError(
      "malformed_credentials",
      "Keito API keys start with kto_. Copy the full-access integration key your administrator created for you.",
    );
  }
  if (/\s/.test(token)) {
    throw new KeitoError("malformed_credentials", "The Keito API key contains spaces or line breaks. Paste it again.");
  }
  if (/[\s/?#]/.test(accountId)) {
    throw new KeitoError(
      "malformed_credentials",
      "The Company ID contains spaces or URL characters. Copy it from Settings → API & Developers → Company ID.",
    );
  }
  return { token, accountId };
}

export type AuthConfig = { kind: "oauth" } | ({ kind: "api_key" } & KeitoCredentials);

/**
 * Both fields blank means "sign in with Keito" (OAuth). Filling in both uses an integration key.
 * Filling in only one is a mistake worth reporting.
 */
export function resolveAuthConfig(input: { token?: string; accountID?: string }): AuthConfig {
  const token = (input.token ?? "").trim();
  const accountId = (input.accountID ?? "").trim();
  if (!token && !accountId) return { kind: "oauth" };
  if (!token || !accountId) {
    throw new KeitoError(
      "malformed_credentials",
      "To use an integration key, enter both the key and the Company ID in the extension preferences. To sign in with Keito in your browser instead, leave both fields blank.",
    );
  }
  return { kind: "api_key", ...validateCredentials(input) };
}
