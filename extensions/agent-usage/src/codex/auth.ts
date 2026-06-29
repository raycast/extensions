import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const DEFAULT_CODEX_AUTH_FILE = path.join(os.homedir(), ".codex", "auth.json");

interface CodexAuthFile {
  OPENAI_API_KEY?: string;
  tokens?: {
    access_token?: string;
    account_id?: string;
    accountId?: string;
    id_token?: string;
  };
}

interface CodexAuthData {
  token: string | null;
  accountId: string | null;
  userId: string | null;
  displayName: string | null;
}

export interface CodexOAuthAccount {
  id: string;
  label: string;
  token: string;
  accountId: string | null;
  userId: string | null;
  source: "active" | "stored";
  authFilePath: string;
}

interface ResolveCodexAuthTokensOptions {
  authFilePath?: string;
}

interface ResolveCodexAuthTokensResult {
  primaryToken: string | null;
  primaryAccountId: string | null;
}

interface ListCodexOAuthAccountsOptions {
  codexHome?: string;
  env?: NodeJS.ProcessEnv;
}

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function trimUnknownStringToNull(value: unknown): string | null {
  return typeof value === "string" ? trimToNull(value) : null;
}

function isExistingDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

function getRecordValue(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readCodexIdentityFromIdToken(idToken: string | undefined): {
  userId: string | null;
  displayName: string | null;
} {
  const token = trimToNull(idToken);
  if (!token) {
    return { userId: null, displayName: null };
  }

  try {
    const [, payload] = token.split(".");
    if (!payload) {
      return { userId: null, displayName: null };
    }

    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8")) as Record<string, unknown>;
    const authClaims = getRecordValue(decoded, "https://api.openai.com/auth");
    return {
      userId: trimUnknownStringToNull(authClaims?.user_id) ?? trimUnknownStringToNull(authClaims?.chatgpt_user_id),
      displayName: trimUnknownStringToNull(decoded.email) ?? trimUnknownStringToNull(decoded.name),
    };
  } catch {
    return { userId: null, displayName: null };
  }
}

function readStoredAccountIdentity(fileName: string): { userId: string; accountId: string } | null {
  if (!fileName.endsWith(".auth.json")) {
    return null;
  }

  try {
    const stem = fileName.slice(0, -".auth.json".length);
    const decoded = Buffer.from(stem, "base64url").toString("utf-8");
    const separatorIndex = decoded.indexOf("::");
    if (separatorIndex === -1) {
      return null;
    }

    const userId = trimToNull(decoded.slice(0, separatorIndex));
    const accountId = trimToNull(decoded.slice(separatorIndex + 2));
    return userId && accountId ? { userId, accountId } : null;
  } catch {
    return null;
  }
}

export function resolveCodexHome(env: NodeJS.ProcessEnv = process.env): string | null {
  const override = trimToNull(env.CODEX_HOME);
  if (override) {
    return isExistingDirectory(override) ? override : null;
  }

  const home = trimToNull(env.HOME) ?? trimToNull(env.USERPROFILE);
  if (!home) {
    return null;
  }

  const codexHome = path.join(home, ".codex");
  return isExistingDirectory(codexHome) ? codexHome : null;
}

function readCodexLoginAuth(authFilePath: string): CodexAuthData {
  try {
    if (!fs.existsSync(authFilePath)) {
      return { token: null, accountId: null, userId: null, displayName: null };
    }

    const raw = fs.readFileSync(authFilePath, "utf-8");
    const parsed = JSON.parse(raw) as CodexAuthFile;
    const identity = readCodexIdentityFromIdToken(parsed.tokens?.id_token);
    return {
      token: trimToNull(parsed.tokens?.access_token),
      accountId: trimToNull(parsed.tokens?.account_id ?? parsed.tokens?.accountId),
      userId: identity.userId,
      displayName: identity.displayName,
    };
  } catch {
    return { token: null, accountId: null, userId: null, displayName: null };
  }
}

function formatStoredAccountLabel(fileName: string, accountId: string, userId: string | null): string {
  if (userId) {
    return userId;
  }

  const stem = fileName.endsWith(".auth.json") ? fileName.slice(0, -".auth.json".length) : fileName;
  const normalized = stem.replace(/[-_]+/g, " ").trim();
  return normalized || accountId;
}

function getCodexAccountDedupeKeys(account: CodexOAuthAccount): string[] {
  const keys = [`token:${account.token}`];
  if (account.userId && account.accountId) {
    keys.unshift(`user-account:${account.userId}:${account.accountId}`);
  }
  return keys;
}

export function listCodexOAuthAccounts(options: ListCodexOAuthAccountsOptions = {}): CodexOAuthAccount[] {
  const codexHome = options.codexHome ?? resolveCodexHome(options.env);
  if (!codexHome) {
    return [];
  }

  const accounts: CodexOAuthAccount[] = [];
  const seen = new Set<string>();

  const addAccount = (account: CodexOAuthAccount): void => {
    const dedupeKeys = getCodexAccountDedupeKeys(account);
    if (dedupeKeys.some((key) => seen.has(key))) {
      return;
    }
    for (const key of dedupeKeys) {
      seen.add(key);
    }
    accounts.push(account);
  };

  const activeAuthPath = path.join(codexHome, "auth.json");
  const activeAuth = readCodexLoginAuth(activeAuthPath);
  if (activeAuth.token) {
    addAccount({
      id: "codex-active",
      label: activeAuth.displayName ?? "Active",
      token: activeAuth.token,
      accountId: activeAuth.accountId,
      userId: activeAuth.userId,
      source: "active",
      authFilePath: activeAuthPath,
    });
  }

  const accountsDir = path.join(codexHome, "accounts");
  let storedFileNames: string[] = [];
  try {
    storedFileNames = fs
      .readdirSync(accountsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".auth.json"))
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    storedFileNames = [];
  }

  for (const fileName of storedFileNames) {
    const authFilePath = path.join(accountsDir, fileName);
    const auth = readCodexLoginAuth(authFilePath);
    const storedIdentity = readStoredAccountIdentity(fileName);
    const accountId = auth.accountId ?? storedIdentity?.accountId ?? null;
    const userId = auth.userId ?? storedIdentity?.userId ?? null;
    if (!auth.token || !accountId) {
      continue;
    }

    addAccount({
      id: `codex-${fileName.slice(0, -".auth.json".length)}`,
      label: auth.displayName ?? formatStoredAccountLabel(fileName, accountId, userId),
      token: auth.token,
      accountId,
      userId,
      source: "stored",
      authFilePath,
    });
  }

  return accounts;
}

export function resolveCodexAuthTokens(options: ResolveCodexAuthTokensOptions = {}): ResolveCodexAuthTokensResult {
  const authFilePath =
    options.authFilePath ?? path.join(resolveCodexHome() ?? path.dirname(DEFAULT_CODEX_AUTH_FILE), "auth.json");
  const localAuth = readCodexLoginAuth(authFilePath);

  return {
    primaryToken: localAuth.token,
    primaryAccountId: localAuth.token ? localAuth.accountId : null,
  };
}

export { normalizeBearerToken as normalizeCodexAuthorizationHeader } from "../agents/http";
