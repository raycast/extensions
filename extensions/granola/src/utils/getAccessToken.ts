import { promises as fs } from "fs";
import { getStoredAccountsPath, getSupabaseConfigPath } from "./granolaConfig";

const TOKEN_EXPIRY_SKEW_MS = 60_000;

interface LocalGranolaUserInfo {
  userInfo: Record<string, unknown>;
  sourceName: string;
}

function parseMaybeJsonRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }

  if (typeof value === "object" && value !== null) {
    return value as Record<string, unknown>;
  }

  return undefined;
}

function requireJsonRecord(value: unknown, label: string): Record<string, unknown> {
  const parsed = parseMaybeJsonRecord(value);
  if (!parsed) {
    throw new Error(`${label} is neither a valid JSON string nor an object`);
  }
  return parsed;
}

function isTokenExpired(tokens: Record<string, unknown> | undefined): boolean {
  const obtainedAt = typeof tokens?.obtained_at === "number" ? tokens.obtained_at : undefined;
  const expiresIn = typeof tokens?.expires_in === "number" ? tokens.expires_in : undefined;
  const obtainedAtMs = obtainedAt && obtainedAt < 10_000_000_000 ? obtainedAt * 1000 : obtainedAt;
  const expiresAtMs = obtainedAtMs && expiresIn ? obtainedAtMs + expiresIn * 1000 : undefined;

  return expiresAtMs ? Date.now() + TOKEN_EXPIRY_SKEW_MS >= expiresAtMs : false;
}

function selectAccessToken(tokens: Record<string, unknown> | undefined): string | undefined {
  if (typeof tokens?.access_token !== "string" || isTokenExpired(tokens)) {
    return undefined;
  }

  return tokens.access_token;
}

function selectAccessTokenFromSupabaseData(jsonData: Record<string, unknown>): string | undefined {
  if (jsonData.workos_tokens) {
    try {
      const accessToken = selectAccessToken(parseMaybeJsonRecord(jsonData.workos_tokens));
      if (accessToken) return accessToken;
    } catch {
      // Fall through to Cognito tokens.
    }
  }

  if (jsonData.cognito_tokens) {
    try {
      return selectAccessToken(parseMaybeJsonRecord(jsonData.cognito_tokens));
    } catch {
      return undefined;
    }
  }

  return undefined;
}

export async function readStoredAccounts(): Promise<Record<string, unknown>[] | undefined> {
  try {
    const fileContent = await fs.readFile(getStoredAccountsPath(), "utf8");
    const jsonData = JSON.parse(fileContent) as Record<string, unknown>;
    const accountsValue = jsonData.accounts;
    const accounts = typeof accountsValue === "string" ? JSON.parse(accountsValue) : accountsValue;

    return Array.isArray(accounts) ? (accounts as Record<string, unknown>[]) : undefined;
  } catch {
    return undefined;
  }
}

function sortStoredAccounts(accounts: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...accounts].sort((a, b) => {
    const aSavedAt = typeof a.savedAt === "number" ? a.savedAt : 0;
    const bSavedAt = typeof b.savedAt === "number" ? b.savedAt : 0;
    return bSavedAt - aSavedAt;
  });
}

async function getAccessTokenFromStoredAccounts(): Promise<string | undefined> {
  const accounts = await readStoredAccounts();
  if (!accounts) return undefined;

  for (const account of sortStoredAccounts(accounts)) {
    try {
      const token = selectAccessToken(parseMaybeJsonRecord(account.tokens));
      if (token) return token;
    } catch {
      // Try the next saved account.
    }
  }

  return undefined;
}

export async function readPlaintextSupabaseConfig(): Promise<Record<string, unknown> | undefined> {
  try {
    const fileContent = await fs.readFile(getSupabaseConfigPath(), "utf8");
    return JSON.parse(fileContent) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

async function getAccessTokenFromPlaintextSupabase(): Promise<string | undefined> {
  const jsonData = await readPlaintextSupabaseConfig();
  return jsonData ? selectAccessTokenFromSupabaseData(jsonData) : undefined;
}

export async function getLocalGranolaUserInfo(): Promise<LocalGranolaUserInfo> {
  const plaintextSupabase = await readPlaintextSupabaseConfig();
  if (plaintextSupabase?.user_info) {
    try {
      return {
        userInfo: requireJsonRecord(plaintextSupabase.user_info, "Supabase config user_info"),
        sourceName: "Supabase config",
      };
    } catch {
      // Fall through to stored accounts.
    }
  }

  const accounts = await readStoredAccounts();
  if (accounts) {
    for (const account of sortStoredAccounts(accounts)) {
      try {
        return {
          userInfo: requireJsonRecord(account.userInfo, "stored account userInfo"),
          sourceName: "stored accounts",
        };
      } catch {
        // Try the next saved account.
      }
    }
  }

  throw new Error("A usable user_info object was not found in local Granola data");
}

async function getAccessToken() {
  const accessToken = (await getAccessTokenFromPlaintextSupabase()) ?? (await getAccessTokenFromStoredAccounts());

  if (!accessToken) {
    throw new Error(
      "A usable access token was not found in your local Granola data. The plaintext tokens may be expired and stored accounts may be unavailable. Make sure Granola is installed, running, and that you are logged in to the application.",
    );
  }

  return accessToken;
}

export default getAccessToken;
