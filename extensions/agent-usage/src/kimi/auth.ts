import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const KIMI_CREDENTIALS_PATH = path.join(os.homedir(), ".kimi", "credentials", "kimi-code.json");
const KIMI_OAUTH_REFRESH_API = "https://auth.kimi.com/api/oauth/token";
const KIMI_OAUTH_CLIENT_ID = "17e5f671-d194-4dfb-9706-5516cb48c098";

export interface KimiCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
  scope: string;
  tokenType: string;
}

interface KimiCredentialsFile {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  scope?: string;
  token_type?: string;
  expires_in?: number;
}

interface KimiRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

function readCredentialsFile(): KimiCredentialsFile | null {
  try {
    if (!fs.existsSync(KIMI_CREDENTIALS_PATH)) return null;
    const raw = fs.readFileSync(KIMI_CREDENTIALS_PATH, "utf-8");
    return JSON.parse(raw) as KimiCredentialsFile;
  } catch {
    return null;
  }
}

export function readKimiCliCredentials(): { credentials: KimiCredentials | null; error: string | null } {
  const parsed = readCredentialsFile();
  if (!parsed) {
    return { credentials: null, error: null };
  }

  const accessToken = parsed.access_token?.trim() || "";
  const refreshToken = parsed.refresh_token?.trim() || "";

  if (!accessToken || !refreshToken) {
    return { credentials: null, error: "Kimi CLI credentials missing access_token or refresh_token." };
  }

  return {
    credentials: {
      accessToken,
      refreshToken,
      expiresAt: typeof parsed.expires_at === "number" ? parsed.expires_at : undefined,
      scope: parsed.scope || "kimi-code",
      tokenType: parsed.token_type || "Bearer",
    },
    error: null,
  };
}

function buildCredentialsFile(credentials: KimiCredentials): KimiCredentialsFile {
  return {
    access_token: credentials.accessToken,
    refresh_token: credentials.refreshToken,
    expires_at: credentials.expiresAt,
    scope: credentials.scope,
    token_type: credentials.tokenType,
  };
}

export function persistKimiCredentials(credentials: KimiCredentials): void {
  try {
    const dir = path.dirname(KIMI_CREDENTIALS_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(KIMI_CREDENTIALS_PATH, `${JSON.stringify(buildCredentialsFile(credentials), null, 2)}\n`, "utf-8");
    // Restrict permissions to owner-read/write only
    try {
      fs.chmodSync(KIMI_CREDENTIALS_PATH, 0o600);
    } catch {
      // Best effort
    }
  } catch {
    // Best effort; continue with refreshed token in memory
  }
}

export async function refreshKimiToken(refreshToken: string): Promise<KimiRefreshResponse | null> {
  const body = new URLSearchParams({
    client_id: KIMI_OAUTH_CLIENT_ID,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(KIMI_OAUTH_REFRESH_API, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as KimiRefreshResponse;
    if (!data.access_token || typeof data.expires_in !== "number") {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
