import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Login discovery for Claude accounts that claude-swap does not track yet. Reads identity metadata only
// (account UUIDs); never credentials. claude-swap keeps each slot's account UUID in sequence.json, and the
// Claude desktop app records the account it is signed in to as lastKnownAccountUuid in its config.json.

export interface ClaudeLoginPaths {
  /** ~/.claude-swap-backup/sequence.json */
  cswapSequence: string;
  /** ~/Library/Application Support/Claude/config.json */
  desktopConfig: string;
}

export function defaultClaudeLoginPaths(): ClaudeLoginPaths {
  const home = os.homedir();
  return {
    cswapSequence: path.join(home, ".claude-swap-backup", "sequence.json"),
    desktopConfig: path.join(home, "Library", "Application Support", "Claude", "config.json"),
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function readJsonObject(file: string): Record<string, unknown> | null {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function uuidOf(value: unknown): string | null {
  return typeof value === "string" && UUID.test(value.trim()) ? value.trim().toLowerCase() : null;
}

/** claude-swap slot number -> account UUID, from sequence.json. Empty when unreadable. */
export function readCswapAccountUuids(paths: ClaudeLoginPaths): Map<number, string> {
  const out = new Map<number, string>();
  const data = readJsonObject(paths.cswapSequence);
  const accounts = data?.accounts;
  if (!accounts || typeof accounts !== "object") return out;
  for (const [slot, entry] of Object.entries(accounts as Record<string, unknown>)) {
    const n = Number.parseInt(slot, 10);
    const uuid = entry && typeof entry === "object" ? uuidOf((entry as Record<string, unknown>).uuid) : null;
    if (Number.isInteger(n) && n > 0 && uuid) out.set(n, uuid);
  }
  return out;
}

/**
 * The account the Claude desktop app is signed in to, or null when unknown. lastKnownAccountUuid survives a
 * sign-out, so a config that records the window as signed out counts as no account.
 */
export function readClaudeAppAccountUuid(paths: ClaudeLoginPaths): string | null {
  const config = readJsonObject(paths.desktopConfig);
  if (!config || config.windowSizeWasSignedIn === false) return null;
  return uuidOf(config.lastKnownAccountUuid);
}

export function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

/**
 * Shell command for the "Add Claude Account" terminal tab. Fails closed: it stops before signing in when
 * claude-swap is missing or cannot save the current Claude Code login (only "no current login" may proceed),
 * because `claude auth login` replaces that login. Then `claude auth login` (browser OAuth; `command` skips shell
 * aliases), `cswap add` for the new account, and optionally reopen AI Accounts so the new row shows up.
 */
export function addClaudeAccountCommand(cswapPath: string, opts: { reopenUrl?: string } = {}): string {
  const cswap = shellQuote(cswapPath);
  const intro = [
    "Add a Claude account to AI Accounts",
    "",
    "1. Your browser opens: sign in with the account to add",
    "   (if claude.ai shows your usual account, switch accounts on that page first).",
    "2. It is saved to claude-swap and appears in Raycast > AI Accounts.",
    "",
  ]
    .map(shellQuote)
    .join(" ");
  const done = shellQuote(
    "Done. The new account is now the active Claude Code login; switch back anytime in Raycast > AI Accounts.",
  );
  const reopen = opts.reopenUrl ? `; open ${shellQuote(opts.reopenUrl)}` : "";
  return [
    `clear; printf '%s\\n' ${intro}`,
    `if [ ! -x ${cswap} ]; then printf '\\nclaude-swap was not found at %s; nothing was changed.\\n' ${cswap}`,
    `elif ! out=$(${cswap} add 2>&1) && case "$out" in *'No active Claude account found'*) false ;; *) true ;; esac; ` +
      `then printf '\\nCould not save your current Claude login, so nothing was changed:\\n%s\\n' "$out"`,
    `elif command claude auth login && ${cswap} add; then printf '\\n%s\\n' ${done}${reopen}`,
    `else printf '\\nSign-in or claude-swap did not finish; your saved accounts are unchanged.\\n'; fi`,
  ].join("; ");
}

/**
 * Auto-add memory (extension state dir). `tracked`: lowercased emails claude-swap has held at some point, so an
 * account the user removed is not silently re-added. `failures`: last failed auto-add per email (30-min back-off).
 */
export interface AutoAddState {
  tracked: string[];
  failures: Record<string, { at: string; error: string }>;
}

export function readAutoAddState(file: string): AutoAddState {
  const data = readJsonObject(file);
  const tracked = Array.isArray(data?.tracked) ? data!.tracked.filter((x): x is string => typeof x === "string") : [];
  const failures: AutoAddState["failures"] = {};
  const raw = data?.failures;
  if (raw && typeof raw === "object") {
    for (const [email, value] of Object.entries(raw as Record<string, unknown>)) {
      const v = value as { at?: unknown; error?: unknown } | null;
      if (v && typeof v.at === "string" && typeof v.error === "string") failures[email] = { at: v.at, error: v.error };
    }
  }
  return { tracked, failures };
}

export function writeAutoAddState(file: string, state: AutoAddState): void {
  fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(tmp, JSON.stringify(state), { mode: 0o600 });
    fs.renameSync(tmp, file);
  } catch {
    try {
      fs.unlinkSync(tmp);
    } catch {
      // ignore
    }
  }
}
