import { readFileSync, writeFileSync } from "fs";
import { resolveCodexCredentialsPath } from "./service-config";

const TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";
const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann";
const REFRESH_THRESHOLD_MS = 8 * 24 * 60 * 60 * 1000; // 8 days

interface CodexAuthFile {
  auth_mode: string;
  tokens: {
    access_token: string;
    refresh_token: string;
    id_token: string;
    account_id?: string;
  };
  last_refresh: string;
}

export function readCodexCredentials(): CodexAuthFile {
  const raw = readFileSync(resolveCodexCredentialsPath(), "utf-8");
  return JSON.parse(raw) as CodexAuthFile;
}

function needsRefresh(auth: CodexAuthFile): boolean {
  const lastRefresh = new Date(auth.last_refresh).getTime();
  return Date.now() - lastRefresh > REFRESH_THRESHOLD_MS;
}

async function refreshCodexToken(auth: CodexAuthFile): Promise<CodexAuthFile> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: auth.tokens.refresh_token,
      scope: "openid profile email",
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Codex token refresh failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    id_token?: string;
  };

  const updated: CodexAuthFile = {
    ...auth,
    tokens: {
      ...auth.tokens,
      access_token: data.access_token,
      ...(data.refresh_token && { refresh_token: data.refresh_token }),
      ...(data.id_token && { id_token: data.id_token }),
    },
    last_refresh: new Date().toISOString(),
  };

  writeFileSync(
    resolveCodexCredentialsPath(),
    JSON.stringify(updated, null, 2),
    "utf-8",
  );
  return updated;
}

export async function getCodexAccessToken(): Promise<{
  accessToken: string;
  accountId?: string;
}> {
  let auth = readCodexCredentials();

  if (needsRefresh(auth)) {
    auth = await refreshCodexToken(auth);
  }

  return {
    accessToken: auth.tokens.access_token,
    accountId: auth.tokens.account_id,
  };
}

export function getCodexPlanType(): string {
  const auth = readCodexCredentials();
  // Decode JWT payload from id_token to extract plan type
  try {
    const parts = auth.tokens.id_token.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString("utf-8"),
      );
      if (payload.chatgpt_plan_type) return payload.chatgpt_plan_type;
    }
  } catch {
    // fall through
  }
  return "";
}
