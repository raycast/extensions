import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const DEFAULT_CODEX_AUTH_FILE = path.join(os.homedir(), ".codex", "auth.json");

interface CodexAuthFile {
  tokens?: {
    access_token?: string;
  };
}

interface ResolveCodexAuthTokenOptions {
  preferenceToken?: string;
  authFilePath?: string;
}

interface ResolveCodexAuthTokensResult {
  primaryToken: string | null;
  localToken: string | null;
  preferenceToken: string | null;
}

interface ShouldFallbackToPreferenceTokenOptions {
  localToken: string | null;
  preferenceToken: string | null;
  errorType?: string;
}

function cleanToken(token: string | undefined): string | null {
  const trimmedToken = token?.trim();
  return trimmedToken ? trimmedToken : null;
}

function readCodexLoginToken(authFilePath: string): string | null {
  try {
    if (!fs.existsSync(authFilePath)) {
      return null;
    }

    const raw = fs.readFileSync(authFilePath, "utf-8");
    const parsed = JSON.parse(raw) as CodexAuthFile;
    return cleanToken(parsed.tokens?.access_token);
  } catch {
    return null;
  }
}

export function resolveCodexAuthTokens(options: ResolveCodexAuthTokenOptions = {}): ResolveCodexAuthTokensResult {
  const localToken = readCodexLoginToken(options.authFilePath ?? DEFAULT_CODEX_AUTH_FILE);
  const preferenceToken = cleanToken(options.preferenceToken);

  return {
    primaryToken: localToken ?? preferenceToken,
    localToken,
    preferenceToken,
  };
}

export function resolveCodexAuthToken(options: ResolveCodexAuthTokenOptions = {}): string | null {
  return resolveCodexAuthTokens(options).primaryToken;
}

export function shouldFallbackToPreferenceToken(options: ShouldFallbackToPreferenceTokenOptions): boolean {
  return (
    options.errorType === "unauthorized" &&
    options.localToken !== null &&
    options.preferenceToken !== null &&
    options.localToken !== options.preferenceToken
  );
}

export { normalizeBearerToken as normalizeCodexAuthorizationHeader } from "../agents/http";
