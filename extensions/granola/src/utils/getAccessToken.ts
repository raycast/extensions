import { promises as fs } from "fs";
import { getStoredAccountsPath, getSupabaseConfigPath } from "./granolaConfig";
import { logGranolaError, logGranolaInfo, logGranolaWarn } from "./errorUtils";

const GRANOLA_API_URL = "https://api.granola.ai/v1";
const GRANOLA_CLIENT_VERSION = "7.162.1";

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

function getGranolaApiHeaders(accessToken: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Granola/${GRANOLA_CLIENT_VERSION} Chrome/146.0.7680.188 Electron/41.2.1 Safari/537.36`,
    "X-Client-Version": GRANOLA_CLIENT_VERSION,
  };
}

async function refreshWorkOsTokensViaApi(
  tokens: Record<string, unknown>,
): Promise<Record<string, unknown> | undefined> {
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;
  if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
    return undefined;
  }

  try {
    const response = await fetch(`${GRANOLA_API_URL}/refresh-access-token`, {
      method: "POST",
      headers: getGranolaApiHeaders(accessToken),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      let responsePreview = "";
      try {
        responsePreview = (await response.text()).slice(0, 200);
      } catch {
        // Ignore body read errors
      }
      logGranolaWarn("refreshWorkOsTokensViaApi failed", {
        status: response.status,
        statusText: response.statusText,
        responsePreview,
      });
      return undefined;
    }

    const newTokens = (await response.json()) as Record<string, unknown>;
    newTokens.obtained_at = Date.now();
    logGranolaInfo("refreshWorkOsTokensViaApi succeeded", {
      expiresIn: typeof newTokens.expires_in === "number" ? newTokens.expires_in : undefined,
    });
    return newTokens;
  } catch (error) {
    logGranolaError("refreshWorkOsTokensViaApi", error);
    return undefined;
  }
}

async function persistWorkOsTokensToSupabase(newTokens: Record<string, unknown>): Promise<void> {
  const configPath = getSupabaseConfigPath();
  const config = (await readPlaintextSupabaseConfig()) ?? {};
  config.workos_tokens = JSON.stringify(newTokens);
  if (typeof newTokens.session_id === "string") {
    config.session_id = newTokens.session_id;
  }
  await fs.writeFile(configPath, JSON.stringify(config));
}

async function persistWorkOsTokensToStoredAccount(
  accountIndex: number,
  newTokens: Record<string, unknown>,
): Promise<void> {
  const fileContent = await fs.readFile(getStoredAccountsPath(), "utf8");
  const jsonData = JSON.parse(fileContent) as Record<string, unknown>;
  const accountsValue = jsonData.accounts;
  const accounts = (typeof accountsValue === "string" ? JSON.parse(accountsValue) : accountsValue) as Record<
    string,
    unknown
  >[];

  if (!Array.isArray(accounts) || accountIndex < 0 || accountIndex >= accounts.length) {
    return;
  }

  accounts[accountIndex].tokens = JSON.stringify(newTokens);
  jsonData.accounts = typeof accountsValue === "string" ? JSON.stringify(accounts) : accounts;
  await fs.writeFile(getStoredAccountsPath(), JSON.stringify(jsonData));
}

async function tryRefreshAndSelectAccessToken(
  tokens: Record<string, unknown> | undefined,
  persist?: (newTokens: Record<string, unknown>) => Promise<void>,
): Promise<string | undefined> {
  if (!tokens || typeof tokens.refresh_token !== "string") {
    return undefined;
  }

  const refreshed = await refreshWorkOsTokensViaApi(tokens);
  if (!refreshed) {
    return undefined;
  }

  if (persist) {
    try {
      await persist(refreshed);
    } catch (persistError) {
      logGranolaError("tryRefreshAndSelectAccessToken.persist", persistError);
    }
  }

  return selectAccessToken(refreshed);
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

  const sortedAccounts = sortStoredAccounts(accounts);
  for (let index = 0; index < sortedAccounts.length; index++) {
    const account = sortedAccounts[index];
    const originalIndex = accounts.indexOf(account);
    try {
      const parsedTokens = parseMaybeJsonRecord(account.tokens);
      const token = selectAccessToken(parsedTokens);
      if (token) return token;

      const refreshedToken = await tryRefreshAndSelectAccessToken(parsedTokens, (newTokens) =>
        persistWorkOsTokensToStoredAccount(originalIndex, newTokens),
      );
      if (refreshedToken) return refreshedToken;
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
  if (!jsonData) return undefined;

  const validToken = selectAccessTokenFromSupabaseData(jsonData);
  if (validToken) return validToken;

  const workosTokens = parseMaybeJsonRecord(jsonData.workos_tokens);
  return tryRefreshAndSelectAccessToken(workosTokens, persistWorkOsTokensToSupabase);
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

function describeTokenRecord(tokens: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!tokens) {
    return { present: false };
  }

  const hasAccessToken = typeof tokens.access_token === "string" && tokens.access_token.length > 0;
  const hasRefreshToken = typeof tokens.refresh_token === "string" && tokens.refresh_token.length > 0;
  return {
    present: true,
    hasAccessToken,
    hasRefreshToken,
    expired: isTokenExpired(tokens),
    obtainedAt: typeof tokens.obtained_at === "number" ? tokens.obtained_at : undefined,
    expiresIn: typeof tokens.expires_in === "number" ? tokens.expires_in : undefined,
  };
}

async function getAccessTokenDiagnostics(): Promise<Record<string, unknown>> {
  const supabasePath = getSupabaseConfigPath();
  const storedAccountsPath = getStoredAccountsPath();
  const diagnostics: Record<string, unknown> = {
    platform: process.platform,
    supabaseConfigPath: supabasePath,
    storedAccountsPath,
  };

  try {
    await fs.access(supabasePath);
    diagnostics.supabaseConfigExists = true;
    const supabase = await readPlaintextSupabaseConfig();
    if (supabase) {
      diagnostics.supabaseHasWorkosTokens = Boolean(supabase.workos_tokens);
      diagnostics.supabaseHasCognitoTokens = Boolean(supabase.cognito_tokens);
      diagnostics.supabaseWorkosTokens = describeTokenRecord(parseMaybeJsonRecord(supabase.workos_tokens));
      diagnostics.supabaseCognitoTokens = describeTokenRecord(parseMaybeJsonRecord(supabase.cognito_tokens));
    } else {
      diagnostics.supabaseConfigReadable = false;
    }
  } catch {
    diagnostics.supabaseConfigExists = false;
  }

  try {
    await fs.access(storedAccountsPath);
    diagnostics.storedAccountsExists = true;
    const accounts = await readStoredAccounts();
    diagnostics.storedAccountCount = accounts?.length ?? 0;
    diagnostics.storedAccounts = (accounts ?? []).map((account, index) => ({
      index,
      savedAt: typeof account.savedAt === "number" ? account.savedAt : undefined,
      tokens: describeTokenRecord(parseMaybeJsonRecord(account.tokens)),
    }));
  } catch {
    diagnostics.storedAccountsExists = false;
  }

  return diagnostics;
}

async function getAccessToken() {
  const accessToken = (await getAccessTokenFromPlaintextSupabase()) ?? (await getAccessTokenFromStoredAccounts());

  if (!accessToken) {
    const diagnostics = await getAccessTokenDiagnostics();
    const workosExpired = diagnostics.supabaseWorkosTokens as { expired?: boolean } | undefined;
    const error = new Error(
      workosExpired?.expired
        ? "Your Granola access token has expired and could not be refreshed automatically. Open the Granola app while logged in to refresh your session, then try again."
        : "A usable access token was not found in your local Granola data. Make sure Granola is installed, running, and that you are logged in to the application.",
    );
    logGranolaError("getAccessToken", error, diagnostics);
    throw error;
  }

  return accessToken;
}

export default getAccessToken;
