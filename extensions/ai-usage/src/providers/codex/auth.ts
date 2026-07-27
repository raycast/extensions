import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ProviderError } from "../../core/models";

const CODEX_HOME_ENV = "CODEX_HOME";
const DEFAULT_CODEX_HOME = path.join(os.homedir(), ".codex");
const AUTH_FILE = "auth.json";

export interface CodexCredentials {
  accessToken: string;
  accountId?: string;
}

interface RawAuthFile {
  tokens?: {
    access_token?: string;
    account_id?: string;
    accountId?: string;
  };
}

export function codexHome(env: NodeJS.ProcessEnv = process.env): string {
  return env[CODEX_HOME_ENV]?.trim() || DEFAULT_CODEX_HOME;
}

export function authPath(env: NodeJS.ProcessEnv = process.env): string {
  return path.join(codexHome(env), AUTH_FILE);
}

export function parseCredentials(payload: string): CodexCredentials | null {
  let raw: RawAuthFile;
  try {
    raw = JSON.parse(payload) as RawAuthFile;
  } catch {
    return null;
  }

  const token = raw.tokens?.access_token?.trim();
  if (!token) return null;

  const accountId = (raw.tokens?.account_id ?? raw.tokens?.accountId)?.trim();
  return { accessToken: token, accountId: accountId || undefined };
}

/**
 * Codex stores its tokens in plaintext, so this is a plain read with no keychain
 * involvement. As with Claude, nothing is ever written back.
 */
export function loadCredentials(env: NodeJS.ProcessEnv = process.env): CodexCredentials {
  const home = codexHome(env);
  if (!fs.existsSync(home)) {
    throw new ProviderError("not-installed", "Codex is not installed.");
  }

  let contents: string;
  try {
    contents = fs.readFileSync(authPath(env), "utf-8");
  } catch {
    throw new ProviderError("not-authed", "Not signed in. Run `codex login` to authenticate.");
  }

  const parsed = parseCredentials(contents);
  if (!parsed) {
    throw new ProviderError("not-authed", "Not signed in. Run `codex login` to authenticate.");
  }
  return parsed;
}
