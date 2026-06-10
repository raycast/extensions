import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const SECURITY = "/usr/bin/security";
/** Keychain item the Claude Code CLI creates on login. */
const SERVICE = "Claude Code-credentials";

export class KeychainError extends Error {}

export interface Auth {
  accessToken: string;
  subscriptionType?: string;
}

async function security(args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(SECURITY, args, { timeout: 10_000 });
    return stdout;
  } catch (e) {
    throw new KeychainError(e instanceof Error ? e.message : String(e));
  }
}

/**
 * Read the Claude Code OAuth access token from the login keychain — read-only.
 *
 * We deliberately do NOT refresh or write anything back. The access token and
 * its refresh token are shared with the Claude Code CLI; self-refreshing would
 * rotate that shared refresh token and, if the write-back ever failed, could
 * strand Claude Code's own login. Instead Claude Code keeps the token fresh
 * through normal use; once it expires, the usage endpoint returns 401 and the
 * UI asks the user to refresh it via Claude Code.
 *
 * Reading works without a Keychain prompt because `/usr/bin/security` — the same
 * binary the CLI uses — is on the item's ACL (unlike app-created items such as
 * "Claude Safe Storage").
 */
export async function getAuth(): Promise<Auth> {
  let json: string;
  try {
    json = (
      await security(["find-generic-password", "-s", SERVICE, "-w"])
    ).trim();
  } catch {
    throw new KeychainError(
      "No Claude Code login found in the Keychain — log in with the Claude Code CLI first.",
    );
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new KeychainError("Claude Code credentials are not valid JSON.");
  }

  const o = (raw.claudeAiOauth ?? raw) as Record<string, unknown>;
  const accessToken = typeof o.accessToken === "string" ? o.accessToken : "";
  if (!accessToken) {
    throw new KeychainError(
      "No access token found in Claude Code credentials.",
    );
  }
  return {
    accessToken,
    subscriptionType:
      typeof o.subscriptionType === "string" ? o.subscriptionType : undefined,
  };
}

/** Human label for the dashboard's "Account" row, e.g. "Team", "Max". */
export function subscriptionLabel(raw?: string): string {
  if (!raw) return "Claude";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}
