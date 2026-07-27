import { execFile } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";
import { ProviderError } from "../../core/models";

const execFileAsync = promisify(execFile);

const CONFIG_DIR_ENV = "CLAUDE_CONFIG_DIR";
const DEFAULT_CONFIG_DIR = path.join(os.homedir(), ".claude");
const CREDENTIALS_FILE = ".credentials.json";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
const KEYCHAIN_TIMEOUT = 5_000;

export interface ClaudeCredentials {
  accessToken: string;
  expiresAt?: number;
  subscriptionType?: string;
  rateLimitTier?: string;
}

interface RawCredentials {
  claudeAiOauth?: {
    accessToken?: string;
    expiresAt?: number;
    subscriptionType?: string;
    rateLimitTier?: string;
  };
}

export function credentialsPaths(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = env[CONFIG_DIR_ENV]?.trim();
  const dirs = configured ? [configured, DEFAULT_CONFIG_DIR] : [DEFAULT_CONFIG_DIR];
  return [...new Set(dirs.map((dir) => path.resolve(dir, CREDENTIALS_FILE)))];
}

export function configDir(env: NodeJS.ProcessEnv = process.env): string {
  return env[CONFIG_DIR_ENV]?.trim() || DEFAULT_CONFIG_DIR;
}

export function parseCredentials(payload: string): ClaudeCredentials | null {
  let raw: RawCredentials;
  try {
    raw = JSON.parse(payload) as RawCredentials;
  } catch {
    return null;
  }

  const oauth = raw.claudeAiOauth;
  const token = oauth?.accessToken?.trim();
  if (!token) return null;

  return {
    accessToken: normalizeToken(token),
    expiresAt: typeof oauth?.expiresAt === "number" ? oauth.expiresAt : undefined,
    subscriptionType: oauth?.subscriptionType,
    rateLimitTier: oauth?.rateLimitTier,
  };
}

function normalizeToken(token: string): string {
  return token.toLowerCase().startsWith("bearer ") ? token.slice(7).trim() : token;
}

async function readKeychain(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", KEYCHAIN_SERVICE, "-w"], {
      timeout: KEYCHAIN_TIMEOUT,
      encoding: "utf-8",
    });
    return stdout.trim() || null;
  } catch {
    // Item missing, keychain locked, or the user denied access — all indistinguishable here.
    return null;
  }
}

/**
 * Reads Claude Code's credentials without ever writing them back.
 *
 * Refresh tokens rotate on use, so refreshing here would invalidate the copy
 * Claude Code holds, and the keychain item also carries unrelated `mcpOAuth`
 * state that a careless write would destroy. An expired token is therefore
 * surfaced as an actionable error instead of being repaired.
 */
export async function loadCredentials(env: NodeJS.ProcessEnv = process.env): Promise<ClaudeCredentials> {
  for (const filePath of credentialsPaths(env)) {
    let contents: string;
    try {
      contents = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }
    const parsed = parseCredentials(contents);
    if (parsed) return assertFresh(parsed);
  }

  const keychainPayload = await readKeychain();
  if (keychainPayload) {
    const parsed = parseCredentials(keychainPayload);
    if (parsed) return assertFresh(parsed);
  }

  if (!fs.existsSync(configDir(env))) {
    throw new ProviderError("not-installed", "Claude Code is not installed.");
  }
  throw new ProviderError("not-authed", "Not signed in. Run `claude` once to authenticate.");
}

function assertFresh(credentials: ClaudeCredentials): ClaudeCredentials {
  if (credentials.expiresAt !== undefined && Date.now() >= credentials.expiresAt) {
    throw new ProviderError("token-expired", "Session expired. Run `claude` once to refresh it.");
  }
  return credentials;
}

export function inferPlan(credentials: ClaudeCredentials): string | undefined {
  const haystack = `${credentials.subscriptionType ?? ""} ${credentials.rateLimitTier ?? ""}`.toLowerCase();
  if (haystack.includes("max")) return "Max";
  if (haystack.includes("enterprise")) return "Enterprise";
  if (haystack.includes("team")) return "Team";
  if (haystack.includes("pro")) return "Pro";
  return undefined;
}
