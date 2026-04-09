import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { decodeJwtPayload } from "../agents/jwt";

const AUTH_V2_FILE = path.join(os.homedir(), ".factory", "auth.v2.file");
const AUTH_V2_KEY = path.join(os.homedir(), ".factory", "auth.v2.key");

const AUTH_LEGACY_PATHS = [
  path.join(os.homedir(), ".factory", "auth.json"),
  path.join(os.homedir(), ".factory", "auth.encrypted"),
];

/**
 * WorkOS OAuth client ID for Droid authentication.
 * This is a public client identifier used for token refresh requests.
 */
const WORKOS_CLIENT_ID = "client_01HNM792M5G5G1A2THWPXKFMXB";

const WORKOS_AUTH_URL = "https://api.workos.com/user_management/authenticate";

/**
 * Buffer time (in milliseconds) before token expiry to trigger a refresh.
 * Set to 1 hour to ensure tokens are refreshed before they expire.
 */
const TOKEN_REFRESH_BUFFER_MS = 60 * 60 * 1000; // refresh 1h before expiry

interface AuthTokens {
  access_token: string;
  refresh_token: string | null;
}

interface AuthState {
  tokens: AuthTokens;
  source: "file";
  filePath: string;
}

function tryParseAuthFile(filePath: string): AuthTokens | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    const accessToken = (parsed.access_token ?? parsed.accessToken) as string | undefined;
    const refreshToken = (parsed.refresh_token ?? parsed.refreshToken) as string | undefined;

    if (!accessToken) return null;
    return { access_token: accessToken, refresh_token: refreshToken ?? null };
  } catch {
    return null;
  }
}

function isTokenExpiringSoon(accessToken: string): boolean {
  const payload = decodeJwtPayload(accessToken);
  if (!payload || typeof payload.exp !== "number") return false;
  const expiresAtMs = payload.exp * 1000;
  return Date.now() + TOKEN_REFRESH_BUFFER_MS >= expiresAtMs;
}

async function refreshAccessToken(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: WORKOS_CLIENT_ID,
    });

    const resp = await fetch(WORKOS_AUTH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (resp.status === 400 || resp.status === 401) return null;
    if (!resp.ok) return null;

    const data = (await resp.json()) as Record<string, unknown>;
    const newAccess = data.access_token as string | undefined;
    if (!newAccess) return null;

    return {
      access_token: newAccess,
      refresh_token: (data.refresh_token as string) ?? refreshToken,
    };
  } catch {
    return null;
  }
}

function saveAuthToFile(filePath: string, tokens: AuthTokens): void {
  try {
    if (filePath === AUTH_V2_FILE) {
      saveAuthV2(tokens);
      return;
    }

    let existing: Record<string, unknown> = {};
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === "object") {
        existing = parsed;
      }
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          ...existing,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        },
        null,
        2,
      ),
      "utf-8",
    );
  } catch {
    // best-effort
  }
}

function saveAuthV2(tokens: AuthTokens): void {
  try {
    if (!fs.existsSync(AUTH_V2_KEY)) return;

    const keyB64 = fs.readFileSync(AUTH_V2_KEY, "utf-8").trim();
    const key = Buffer.from(keyB64, "base64");
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const plaintext = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    let encrypted = cipher.update(plaintext, "utf-8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    const content = [iv.toString("base64"), tag.toString("base64"), encrypted.toString("base64")].join(":");
    fs.writeFileSync(AUTH_V2_FILE, content, "utf-8");
  } catch {
    // best-effort
  }
}

function tryParseAuthV2(): { tokens: AuthTokens; filePath: string } | null {
  try {
    if (!fs.existsSync(AUTH_V2_FILE) || !fs.existsSync(AUTH_V2_KEY)) return null;

    const keyB64 = fs.readFileSync(AUTH_V2_KEY, "utf-8").trim();
    const fileContent = fs.readFileSync(AUTH_V2_FILE, "utf-8").trim();

    const parts = fileContent.split(":");
    if (parts.length !== 3) return null;

    const key = Buffer.from(keyB64, "base64");
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const ciphertext = Buffer.from(parts[2], "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(ciphertext, undefined, "utf-8");
    decrypted += decipher.final("utf-8");

    const parsed = JSON.parse(decrypted) as Record<string, unknown>;
    const accessToken = (parsed.access_token ?? parsed.accessToken) as string | undefined;
    const refreshToken = (parsed.refresh_token ?? parsed.refreshToken) as string | undefined;

    if (!accessToken) return null;
    return { tokens: { access_token: accessToken, refresh_token: refreshToken ?? null }, filePath: AUTH_V2_FILE };
  } catch {
    return null;
  }
}

function loadAuthFromFiles(): AuthState | null {
  // Try v2 encrypted format first
  const v2 = tryParseAuthV2();
  if (v2) return { tokens: v2.tokens, source: "file", filePath: v2.filePath };

  // Fall back to legacy plain-text files
  for (const filePath of AUTH_LEGACY_PATHS) {
    const tokens = tryParseAuthFile(filePath);
    if (tokens) return { tokens, source: "file", filePath };
  }
  return null;
}

export interface ResolveDroidAuthResult {
  accessToken: string | null;
  source: "local_file" | null;
}

export async function resolveDroidAuth(): Promise<ResolveDroidAuthResult> {
  const fileAuth = loadAuthFromFiles();
  if (!fileAuth) {
    return { accessToken: null, source: null };
  }

  let { tokens } = fileAuth;

  // Auto-refresh if token is expiring soon
  if (isTokenExpiringSoon(tokens.access_token) && tokens.refresh_token) {
    const refreshed = await refreshAccessToken(tokens.refresh_token);
    if (refreshed) {
      tokens = refreshed;
      if (fileAuth.filePath) {
        saveAuthToFile(fileAuth.filePath, tokens);
      }
    }
  }

  return { accessToken: tokens.access_token, source: "local_file" };
}
