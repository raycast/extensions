/**
 * Reads the session the official `argocd` CLI already holds.
 *
 * `argocd login <host> --sso` runs the OIDC PKCE loopback flow and stores the resulting bearer
 * token in ~/.config/argocd/config (mode 0600). Reusing it means this extension registers no
 * OIDC redirect URI, holds no client secret, and writes no credential of its own: the token
 * lifecycle stays owned by the tool that already owns it.
 *
 * The JWT is decoded, never verified. The server is the authority on validity; the local
 * decode exists only to offer a re-login before a request that is certain to fail.
 */

import { homedir } from "node:os";
import { join } from "node:path";
import { readFile as readFileFs } from "node:fs/promises";
import { parse as parseYaml } from "yaml";

export interface CliToken {
  token: string;
  expiresAt: Date | undefined;
  /**
   * The refresh token `argocd login --sso` stores next to the bearer. Reading it is what lets
   * the session be renewed without asking anyone: without it, an OIDC id token lapses after an
   * hour and the mode is only usable with a non-expiring account token.
   */
  refreshToken: string | undefined;
}

export interface CliConfigReaderDeps {
  readFile?: (path: string) => Promise<string>;
  configPath?: string;
}

const DEFAULT_SKEW_SECONDS = 30;

export function defaultCliConfigPath(): string {
  return join(homedir(), ".config", "argocd", "config");
}

export function decodeJwtExpiry(token: string): Date | undefined {
  const segments = token.split(".");
  if (segments.length !== 3) {
    return undefined;
  }
  const payload = segments[1];
  if (!payload) {
    return undefined;
  }

  let json: string;
  try {
    // Buffer's base64url decoder restores the missing "=" padding on its own.
    json = Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return undefined;
  }
  if (json.length === 0) {
    return undefined;
  }

  let claims: unknown;
  try {
    claims = JSON.parse(json);
  } catch {
    return undefined;
  }
  if (typeof claims !== "object" || claims === null) {
    return undefined;
  }

  const exp = (claims as Record<string, unknown>).exp;
  if (typeof exp !== "number" || !Number.isFinite(exp)) {
    return undefined;
  }
  return new Date(exp * 1000);
}

export function isExpired(token: CliToken, now: Date, skewSeconds: number = DEFAULT_SKEW_SECONDS): boolean {
  if (!token.expiresAt) {
    return false;
  }
  return token.expiresAt.getTime() - skewSeconds * 1000 <= now.getTime();
}

export function extractToken(configYaml: string, host: string): CliToken | undefined {
  let document: unknown;
  try {
    document = parseYaml(configYaml);
  } catch {
    return undefined;
  }
  if (typeof document !== "object" || document === null) {
    return undefined;
  }

  const users = (document as Record<string, unknown>).users;
  if (!Array.isArray(users)) {
    return undefined;
  }

  for (const entry of users) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const record = entry as Record<string, unknown>;
    // The CLI keys users by the exact server string it was given, port included, so the match
    // is exact: argocd.example.com and argocd.example.com:8443 are two different sessions.
    if (record.name !== host) {
      continue;
    }
    const token = record["auth-token"];
    if (typeof token !== "string" || token.length === 0) {
      return undefined;
    }
    const refresh = record["refresh-token"];
    return {
      token,
      expiresAt: decodeJwtExpiry(token),
      refreshToken: typeof refresh === "string" && refresh.length > 0 ? refresh : undefined,
    };
  }

  return undefined;
}

export async function readCliToken(host: string, deps: CliConfigReaderDeps = {}): Promise<CliToken | undefined> {
  const read = deps.readFile ?? ((path: string) => readFileFs(path, "utf8"));
  const path = deps.configPath ?? defaultCliConfigPath();

  let contents: string;
  try {
    contents = await read(path);
  } catch {
    // A missing or unreadable config is the normal "never logged in" case, not an error worth
    // surfacing here: the token provider turns it into an actionable AuthError.
    return undefined;
  }

  return extractToken(contents, host);
}
