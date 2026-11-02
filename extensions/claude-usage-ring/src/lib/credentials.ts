import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

export type Creds = {
  accessToken: string;
  expiresAt?: number;
  subscriptionType?: string;
  rateLimitTier?: string;
};

export type CredentialsErrorKind = "not_found" | "denied" | "malformed" | "expired";

export class CredentialsError extends Error {
  constructor(
    public kind: CredentialsErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "CredentialsError";
  }
}

export async function readCredentials(source: "keychain" | "file"): Promise<Creds> {
  const raw = source === "keychain" ? await fromKeychain() : await fromFile();
  return parseCredentials(raw);
}

export function parseCredentials(raw: string): Creds {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new CredentialsError("malformed", "Credentials JSON is not parsable");
  }
  const o = (json as { claudeAiOauth?: Record<string, unknown> } | null)?.claudeAiOauth;
  if (!o || typeof o.accessToken !== "string" || !o.accessToken) {
    throw new CredentialsError("not_found", "No claudeAiOauth.accessToken in credentials");
  }
  return {
    accessToken: o.accessToken,
    expiresAt: typeof o.expiresAt === "number" ? o.expiresAt : undefined,
    subscriptionType: typeof o.subscriptionType === "string" ? o.subscriptionType : undefined,
    rateLimitTier: typeof o.rateLimitTier === "string" ? o.rateLimitTier : undefined,
  };
}

async function fromKeychain(): Promise<string> {
  try {
    const { stdout } = await pExecFile(
      "/usr/bin/security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { timeout: 5000 },
    );
    return stdout.trim();
  } catch (e) {
    const code = (e as { code?: unknown })?.code;
    if (code === 44) throw new CredentialsError("not_found", "Keychain item not found");
    throw new CredentialsError("denied", `Keychain access failed (code ${String(code)})`);
  }
}

async function fromFile(): Promise<string> {
  try {
    return await readFile(join(homedir(), ".claude", ".credentials.json"), "utf8");
  } catch {
    throw new CredentialsError("not_found", "~/.claude/.credentials.json not found");
  }
}
