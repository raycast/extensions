import { getOAuthApiKey } from "@mariozechner/pi-ai/oauth";
import {
  OAUTH_ENV_KEY,
  parseCredentials,
  type StoredCredentials,
} from "../lib/oauth-credentials.js";

let credentials: StoredCredentials | null | undefined;

function readCredentialsFromEnvironment(): StoredCredentials {
  if (credentials !== undefined) {
    if (!credentials) {
      throw new Error(
        "Not signed in. Run the Raycast command: Sign In with ChatGPT.",
      );
    }
    return credentials;
  }

  const raw = process.env[OAUTH_ENV_KEY];
  if (!raw) {
    credentials = null;
    throw new Error(
      "Not signed in. Run the Raycast command: Sign In with ChatGPT.",
    );
  }

  credentials = parseCredentials(raw);
  delete process.env[OAUTH_ENV_KEY];
  return credentials;
}

export async function resolveAccessToken(): Promise<string> {
  const current = readCredentialsFromEnvironment();
  if (Date.now() < current.expires && current.access) {
    return current.access;
  }

  const refreshed = await getOAuthApiKey("openai-codex", {
    "openai-codex": current,
  });
  if (!refreshed) {
    throw new Error("OpenAI OAuth token refresh failed.");
  }

  credentials = {
    ...current,
    ...refreshed.newCredentials,
    type: "oauth",
    provider: "openai-codex",
  };
  return refreshed.apiKey;
}
