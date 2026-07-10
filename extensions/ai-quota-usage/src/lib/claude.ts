import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir, userInfo } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { asNumber, asRecord, asString } from "./json";
import type { QuotaWindow, ToolQuota } from "./types";

const execFileAsync = promisify(execFile);

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
// Must start with "claude-code/" or Anthropic drops the request into an aggressively
// throttled bucket. Bump to match your installed Claude Code when it drifts.
const CLAUDE_CODE_UA = "claude-code/2.1.205";
const KEYCHAIN_SERVICE = "Claude Code-credentials";
// The usage endpoint rejects (403) any token without this scope. Claude Code's own login
// carries it; `claude setup-token` tokens do not.
const REQUIRED_SCOPE = "user:profile";

function claudeBaseDir(override?: string): string {
  const trimmed = override?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : join(homedir(), ".claude");
}

// Strip anything that isn't printable ASCII. A stray Unicode / zero-width char — common
// when pasting a token through an IME — otherwise makes the Authorization header an
// invalid ByteString and `fetch` throws before the request goes out.
function cleanToken(token: string): string {
  return token.replace(/[^\x21-\x7e]/g, "");
}

function suffix(detail: string): string {
  return detail ? ` · ${detail}` : "";
}

/**
 * Pull a human-readable reason out of an Anthropic error body so the UI can say *why*
 * a request failed instead of just its status code. Anthropic errors are small JSON
 * (`{ error: { type, message } }`); a WAF/CDN block is HTML — trim either to a snippet.
 * Never contains the token, so it is safe to surface.
 */
function anthropicErrorMessage(body: string): string {
  if (!body) return "";
  try {
    const r = asRecord(JSON.parse(body));
    const err = asRecord(r?.error);
    const m = asString(err?.message) ?? asString(r?.message) ?? asString(err?.type);
    if (m) return m.slice(0, 140);
  } catch {
    // non-JSON body (e.g. a Cloudflare/WAF HTML block page)
  }
  return body.replace(/\s+/g, " ").trim().slice(0, 120);
}

interface ClaudeCreds {
  accessToken: string;
  /** Unix milliseconds when the access token expires, when known. */
  expiresAt?: number;
  scopes?: string[];
}

function credsFromJson(raw: string): ClaudeCreds | undefined {
  try {
    const root = asRecord(JSON.parse(raw));
    const oauth = asRecord(root?.claudeAiOauth);
    const accessToken = asString(oauth?.accessToken);
    if (!accessToken) return undefined;
    const scopesRaw = oauth?.scopes;
    const scopes = Array.isArray(scopesRaw) ? scopesRaw.filter((s): s is string => typeof s === "string") : undefined;
    return { accessToken, expiresAt: asNumber(oauth?.expiresAt), scopes };
  } catch {
    return undefined;
  }
}

async function keychainRead(account?: string): Promise<ClaudeCreds | undefined> {
  try {
    const args = ["find-generic-password", "-s", KEYCHAIN_SERVICE];
    if (account) args.push("-a", account);
    args.push("-w");
    const { stdout } = await execFileAsync("security", args);
    return credsFromJson(stdout);
  } catch {
    return undefined; // no matching Keychain item / access denied
  }
}

/**
 * The current Claude Code login from the macOS Keychain. Claude Code stores it under the
 * generic-password service `Claude Code-credentials` with the account set to the macOS
 * username, but older versions left a second entry with an empty account — and a bare
 * `security -w` returns that (often stale) empty-account entry. So read both the
 * username-scoped and the bare entry and keep whichever expires latest. See
 * anthropics/claude-code#9403 (Keychain service/account drift across versions).
 */
async function keychainCreds(): Promise<ClaudeCreds | undefined> {
  let username: string | undefined;
  try {
    username = userInfo().username;
  } catch {
    username = process.env.USER;
  }
  const reads = username ? [keychainRead(username), keychainRead()] : [keychainRead()];
  const found = (await Promise.all(reads)).filter((c): c is ClaudeCreds => c !== undefined);
  if (found.length === 0) return undefined;
  found.sort((a, b) => (b.expiresAt ?? 0) - (a.expiresAt ?? 0)); // freshest first
  return found[0];
}

/**
 * Claude Code's OAuth credentials, read (never written) from Claude Code's own login.
 * We prefer that login — the credentials file, then the macOS Keychain — because only it
 * carries the `user:profile` scope the usage endpoint requires. A token from the env var
 * or pasted into preferences is a last resort for power users who supply their own.
 */
async function readCreds(baseDir: string, overrideToken?: string): Promise<ClaudeCreds | undefined> {
  try {
    const raw = await fs.readFile(join(baseDir, ".credentials.json"), "utf8");
    const creds = credsFromJson(raw);
    if (creds) return creds;
  } catch {
    // no credentials file — try the Keychain
  }

  const kc = await keychainCreds();
  if (kc) return kc;

  const envToken = process.env.CLAUDE_CODE_OAUTH_TOKEN?.trim();
  if (envToken) return { accessToken: envToken };

  const pasted = overrideToken?.trim();
  if (pasted) return { accessToken: pasted };

  return undefined;
}

function isoToUnix(v: unknown): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const ms = Date.parse(s);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

function toWindow(name: string, raw: unknown): QuotaWindow | undefined {
  const r = asRecord(raw);
  if (!r) return undefined;
  const usedPercent = asNumber(r.utilization);
  const resetsAt = isoToUnix(r.resets_at);
  if (usedPercent === undefined || resetsAt === undefined) return undefined;
  return { name, usedPercent, resetsAt };
}

/**
 * Fetch Claude Code's live quota from the undocumented `oauth/usage` endpoint, using the
 * token from Claude Code's own login as-is (we never refresh it — when it expires the user
 * re-logs into Claude Code). Network + auth; never throws — failures come back as
 * `ToolQuota.error`. Not called directly — go through `readClaudeQuota`, which adds
 * throttling and last-good fallback.
 */
async function fetchClaudeQuota(overrideDir?: string): Promise<ToolQuota> {
  const now = Math.floor(Date.now() / 1000);
  const base: ToolQuota = { tool: "Claude Code", windows: [], source: "live", fetchedAt: now };

  const pasted = getPreferenceValues<{ claudeToken?: string }>().claudeToken;
  const creds = await readCreds(claudeBaseDir(overrideDir), pasted);
  if (!creds) {
    return { ...base, error: "No Claude Code login found — run `claude` to sign in" };
  }
  if (creds.expiresAt !== undefined && creds.expiresAt <= Date.now()) {
    return { ...base, error: "Claude Code login expired — run `claude` to re-login" };
  }
  if (creds.scopes && !creds.scopes.includes(REQUIRED_SCOPE)) {
    return { ...base, error: "Login can't read usage (needs user:profile) — re-login to Claude Code" };
  }

  const accessToken = cleanToken(creds.accessToken);
  if (!accessToken) {
    return { ...base, error: "Token is empty after cleanup — re-paste it" };
  }

  let res: Awaited<ReturnType<typeof fetch>>;
  try {
    res = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "anthropic-beta": "oauth-2025-04-20",
        "User-Agent": CLAUDE_CODE_UA,
        Accept: "application/json",
      },
    });
  } catch {
    return { ...base, error: "Network error reaching Anthropic" };
  }

  let bodyText = "";
  try {
    bodyText = await res.text();
  } catch {
    // body unreadable — fall through with empty detail
  }

  if (!res.ok) {
    const detail = anthropicErrorMessage(bodyText);
    if (res.status === 429) return { ...base, error: `Rate-limited (429) — try later${suffix(detail)}` };
    if (res.status === 401)
      return { ...base, error: `Token rejected (401) — run \`claude\` to re-login${suffix(detail)}` };
    if (res.status === 403)
      return { ...base, error: `Forbidden (403)${detail ? suffix(detail) : " — this login can't read usage"}` };
    return { ...base, error: `HTTP ${res.status}${suffix(detail)}` };
  }

  let data: unknown;
  try {
    data = JSON.parse(bodyText);
  } catch {
    return { ...base, error: "Bad response from Anthropic" };
  }

  const d = asRecord(data);
  const windows = [
    toWindow("5-Hour", d?.five_hour),
    toWindow("Weekly", d?.seven_day),
    toWindow("Weekly · Opus", d?.seven_day_opus),
    toWindow("Weekly · Sonnet", d?.seven_day_sonnet),
  ].filter((w): w is QuotaWindow => w !== undefined);

  if (windows.length === 0) {
    return { ...base, error: "No usage windows returned" };
  }
  return { ...base, windows };
}

const CACHE_KEY = "claude-quota-cache-v1";
const FRESH_MS = 5 * 60 * 1000; // reuse a good result without calling the endpoint
const STALE_OK_MS = 60 * 60 * 1000; // on failure, fall back to a good result up to this old

interface CacheEntry {
  at: number; // unix ms when fetched
  quota: ToolQuota;
}

async function loadCache(): Promise<CacheEntry | undefined> {
  try {
    const raw = await LocalStorage.getItem<string>(CACHE_KEY);
    if (!raw) return undefined;
    const rec = asRecord(JSON.parse(raw));
    const at = asNumber(rec?.at);
    const quota = asRecord(rec?.quota);
    if (at === undefined || !quota || !Array.isArray(quota.windows)) return undefined;
    return { at, quota: quota as unknown as ToolQuota };
  } catch {
    return undefined;
  }
}

async function saveCache(quota: ToolQuota): Promise<void> {
  try {
    await LocalStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), quota }));
  } catch {
    // caching is best-effort
  }
}

/**
 * Live Claude quota with throttling + last-good fallback. `oauth/usage` rate-limits
 * aggressively, so we reuse a recent good result (<=5 min) without calling, and on any
 * failure fall back to the last good result (<=1 h) instead of surfacing the error.
 */
export async function readClaudeQuota(overrideDir?: string): Promise<ToolQuota> {
  const cache = await loadCache();
  const good = cache && cache.quota.windows.length > 0 ? cache : undefined;

  if (good && Date.now() - good.at < FRESH_MS) {
    return good.quota; // fresh enough — skip the endpoint entirely
  }

  const fresh = await fetchClaudeQuota(overrideDir);
  if (fresh.windows.length > 0) {
    await saveCache(fresh);
    return fresh;
  }

  // Fetch failed (429 / expired / network). Prefer a recent good result over the error.
  if (good && Date.now() - good.at < STALE_OK_MS) {
    return { ...good.quota, fetchedAt: Math.floor(good.at / 1000) };
  }
  return fresh;
}
