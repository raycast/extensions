import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Kept free of @raycast/api imports so `npm test` runs it under plain Node.

export const SCHEMA_VERSION = 1;

export type Provider = "claude" | "codex";

export type UsageWindow = { pct: number; countdown?: string };

export type Account = {
  number: number;
  email: string;
  alias?: string;
  organizationName?: string;
  active: boolean;
  disabled?: boolean;
  usage: { fiveHour?: UsageWindow; sevenDay?: UsageWindow; weekly?: UsageWindow } | null;
};

export type Accounts = Record<Provider, Account[]>;

type Section = { schemaVersion?: number; accounts?: (Account & { lastGoodUsage?: Account["usage"] })[] };

// Raycast does not load the login shell, so PATH lacks where uv, pipx and Homebrew install ccswap.
export function resolveBinary(preferred?: string): string | undefined {
  const candidates = preferred
    ? [preferred]
    : [join(homedir(), ".local/bin/ccswap"), "/opt/homebrew/bin/ccswap", "/usr/local/bin/ccswap"];
  return candidates.find((path) => existsSync(path));
}

export function parseList(stdout: string): Accounts {
  const data = JSON.parse(stdout) as { error?: { message: string } } & Partial<Record<Provider, Section | null>>;
  if (data.error) throw new Error(data.error.message);
  const out: Accounts = { claude: [], codex: [] };
  for (const provider of ["claude", "codex"] as const) {
    const section = data[provider];
    if (!section) continue;
    if (section.schemaVersion !== undefined && section.schemaVersion !== SCHEMA_VERSION) {
      throw new Error(`ccswap JSON schema ${section.schemaVersion} is not supported. Update this extension.`);
    }
    // A failed refresh leaves usage null; the last good reading still beats a blank row.
    out[provider] = (section.accounts ?? []).map(({ lastGoodUsage, ...a }) => ({
      ...a,
      usage: a.usage ?? lastGoodUsage ?? null,
    }));
  }
  return out;
}

export function errorMessage(stdout: string, stderr: string): string | undefined {
  try {
    const message = (JSON.parse(stdout) as { error?: { message?: string } }).error?.message;
    if (message) return message;
  } catch {
    // not JSON, fall through to stderr
  }
  return stderr.trim() || undefined;
}

export function run(bin: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = execFile(bin, args, { timeout: 30_000 }, (error, stdout, stderr) => {
      if (error) reject(new Error(errorMessage(stdout, stderr) ?? error.message));
      else resolve(stdout);
    });
    // A CLI prompt gets EOF and fails instead of hanging the command.
    child.stdin?.end();
  });
}

export function listAccounts(bin: string): Promise<Accounts> {
  return run(bin, ["list", "--json"]).then(parseList);
}

export function switchArgs(provider: Provider, number?: number): string[] {
  const target = number === undefined ? ["--strategy", "best"] : [String(number)];
  const base = provider === "codex" ? ["codex", "switch"] : ["switch"];
  return [...base, ...target, "--json"];
}

export function label(account: Account): string {
  return account.alias || account.email;
}
