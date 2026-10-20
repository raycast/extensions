import { Cache } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { AuthFile, clearCooldown, isRecord, upstream, UpstreamResponse } from "./api";

// Upstream quota for Codex and Claude accounts, fetched through CLIProxyAPI's /api-call proxy.
// Endpoints and headers mirror the official Management Center (router-for-me/Cli-Proxy-API-Management-Center).

/** `resetsAt` is epoch ms (plain numbers survive Raycast's JSON cache, Dates don't). */
export type QuotaWindow = { label: string; usedPercent: number | null; resetsAt: number | null };

/** Percent of the window still available (0-100), or null if upstream didn't say. */
export function percentLeft(window: QuotaWindow): number | null {
  return window.usedPercent === null ? null : Math.min(100, Math.max(0, 100 - window.usedPercent));
}

/** A rate-limit reset the account can spend right now (or why it can't). */
export type ResetOffer =
  | { kind: "codex"; available: number }
  | { kind: "claude"; grantsLeft: number; grantId: string | null; blocker: string | null };

export type Quota = { plan: string | null; windows: QuotaWindow[]; reset: ResetOffer | null };

/** The account fields quota fetching depends on; stable across routine status changes. */
export type QuotaAccount = Pick<AuthFile, "auth_index" | "provider" | "id_token">;

export function supportsQuota(file: AuthFile): boolean {
  return (file.provider === "codex" || file.provider === "claude") && !file.disabled && file.auth_index !== "";
}

export function canUseReset(offer: ResetOffer | null | undefined): boolean {
  if (!offer) return false;
  return offer.kind === "codex" ? offer.available > 0 : offer.grantId !== null;
}

export function fetchQuota(file: QuotaAccount): Promise<Quota> {
  return file.provider === "codex" ? fetchCodexQuota(file) : fetchClaudeQuota(file);
}

/** Latest quota for an account. On failure `quota` is the last good fetch (if any) and `error` says why it's stale. */
export type QuotaResult = { quota: Quota | null; fetchedAt: number | null; error: string | null };

const lastGood = new Cache({ namespace: "quota" });

export async function loadQuota(account: QuotaAccount): Promise<QuotaResult> {
  try {
    const result = { quota: await fetchQuota(account), fetchedAt: Date.now(), error: null };
    lastGood.set(account.auth_index, JSON.stringify(result));
    return result;
  } catch (error) {
    const cached = lastGood.get(account.auth_index);
    const previous: QuotaResult | null = cached ? JSON.parse(cached) : null;
    const message = error instanceof Error ? error.message : String(error);
    return { quota: previous?.quota ?? null, fetchedAt: previous?.fetchedAt ?? null, error: message };
  }
}

/** Spend one reset credit/grant, then clear CLIProxyAPI's local cooldown. Returns a status message. */
export async function spendReset(file: QuotaAccount): Promise<string> {
  if (file.provider === "codex") await consumeCodexCredit(file);
  else await claimClaudeGrant(file);
  try {
    await clearCooldown(file.auth_index);
  } catch {
    return "Reset used, but clearing the local cooldown failed";
  }
  return "Rate limits reset";
}

// MARK: Codex

const CODEX_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const CODEX_CREDITS_URL = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits";
const CODEX_CONSUME_URL = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume";

function codexHeaders(file: QuotaAccount): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: "Bearer $TOKEN$",
    "Content-Type": "application/json",
    "User-Agent": "codex-tui/0.149.1 (Mac OS 26.5.2; arm64) iTerm.app/3.6.11 (codex-tui; 0.149.1)",
  };
  const accountId = file.id_token?.chatgpt_account_id;
  if (accountId) headers["Chatgpt-Account-Id"] = accountId;
  return headers;
}

async function fetchCodexQuota(file: QuotaAccount): Promise<Quota> {
  const headers = codexHeaders(file);
  const creditHeaders = {
    ...headers,
    Accept: "application/json",
    "OpenAI-Beta": "codex-1",
    Originator: "Codex Desktop",
  };
  const [usage, credits] = await Promise.all([
    upstream(file.auth_index, "GET", CODEX_USAGE_URL, headers),
    upstream(file.auth_index, "GET", CODEX_CREDITS_URL, creditHeaders).catch(() => null),
  ]);
  const payload = expectOk(usage);

  const rateLimit = record(payload.rate_limit);
  const limitReached = rateLimit.limit_reached === true || rateLimit.allowed === false;
  const windows = [rateLimit.primary_window, rateLimit.secondary_window]
    .filter(isRecord)
    .map((window, i): QuotaWindow => {
      const resetAfter = num(window.reset_after_seconds);
      return {
        label: codexWindowLabel(num(window.limit_window_seconds), i),
        usedPercent: num(window.used_percent) ?? (limitReached ? 100 : null),
        resetsAt: toMs(window.reset_at) ?? (resetAfter !== null ? Date.now() + resetAfter * 1000 : null),
      };
    });

  const creditBody = credits && credits.status >= 200 && credits.status < 300 ? record(credits.body) : {};
  const available =
    num(creditBody.available_count) ??
    num(record(payload.rate_limit_reset_credits).available_count) ??
    (Array.isArray(creditBody.credits) ? creditBody.credits.length : 0);

  return {
    plan: str(payload.plan_type) ?? file.id_token?.plan_type ?? null,
    windows,
    reset: { kind: "codex", available },
  };
}

function codexWindowLabel(seconds: number | null, index: number): string {
  if (seconds === 18_000) return "5-Hour";
  if (seconds === 604_800) return "Weekly";
  if (seconds !== null && seconds >= 28 * 86_400 && seconds <= 31 * 86_400) return "Monthly";
  return index === 0 ? "Primary" : "Secondary";
}

async function consumeCodexCredit(file: QuotaAccount): Promise<void> {
  const res = await upstream(file.auth_index, "POST", CODEX_CONSUME_URL, codexHeaders(file), {
    redeem_request_id: randomUUID(),
  });
  const code = expectOk(res).code;
  if (code !== "reset" && code !== "already_redeemed") {
    throw new Error("Codex did not confirm the reset");
  }
}

// MARK: Claude

const ANTHROPIC = "https://api.anthropic.com";
const CLAUDE_HEADERS = {
  "User-Agent": "claude-cli/2.1.280 (external, cli)",
  Authorization: "Bearer $TOKEN$",
  "Content-Type": "application/json",
  "anthropic-beta": "oauth-2025-04-20",
};
const CLAUDE_WINDOWS: [key: string, label: string][] = [
  ["five_hour", "5-Hour"],
  ["seven_day", "Weekly"],
  ["seven_day_opus", "Weekly Opus"],
  ["seven_day_sonnet", "Weekly Sonnet"],
  ["iguana_necktie", "Weekly Fable"],
  ["seven_day_oauth_apps", "Weekly OAuth Apps"],
  ["seven_day_cowork", "Weekly Cowork"],
];
const GRANT_ID_RE = /^[a-z0-9_-]{1,40}$/;
const ORG_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchClaudeQuota(file: QuotaAccount): Promise<Quota> {
  // One request for windows and reset grants: Anthropic rate-limits this endpoint hard.
  const res = await upstream(file.auth_index, "GET", `${ANTHROPIC}/api/oauth/usage?cedar_ember=1`, {
    ...CLAUDE_HEADERS,
    Accept: "application/json",
  });
  const payload = expectOk(res);

  const windows: QuotaWindow[] = [];
  for (const [key, label] of CLAUDE_WINDOWS) {
    const window = payload[key];
    // Dollar-denominated credit pools aren't percentage windows; skip them.
    if (!isRecord(window) || num(window.utilization) === null || window.limit_dollars != null) continue;
    windows.push({ label, usedPercent: num(window.utilization), resetsAt: toMs(window.resets_at) });
  }
  if (!windows.some((w) => w.label === "Weekly Fable")) {
    const fable = claudeFableLimit(payload);
    if (fable) windows.push(fable);
  }

  let reset: ClaudeGrantStatus | null = null;
  try {
    reset = parseClaudeGrants(payload.cedar_ember);
  } catch {
    // Grant program missing or malformed: show windows without reset info.
  }
  return { plan: null, windows, reset };
}

/** Newer payloads report Fable's weekly limit in `limits[]` instead of a named key. */
function claudeFableLimit(payload: Record<string, unknown>): QuotaWindow | null {
  if (!Array.isArray(payload.limits)) return null;
  const candidates = payload.limits.filter(isRecord).filter((limit) => {
    const model = str(record(record(limit.scope).model).display_name)?.toLowerCase();
    return limit.kind === "weekly_scoped" && (model === "fable" || model === "fable 5") && num(limit.percent) !== null;
  });
  const limit = candidates.find((l) => l.is_active === true) ?? candidates[0];
  return limit ? { label: "Weekly Fable", usedPercent: num(limit.percent), resetsAt: toMs(limit.resets_at) } : null;
}

type ClaudeGrantStatus = Extract<ResetOffer, { kind: "claude" }>;

/** Fresh read of the reset-grant program, used right before spending one. */
async function readClaudeGrants(file: QuotaAccount): Promise<ClaudeGrantStatus> {
  const res = await upstream(
    file.auth_index,
    "GET",
    `${ANTHROPIC}/api/oauth/usage?cedar_ember=1&skip_spend=1`,
    CLAUDE_HEADERS,
  );
  return parseClaudeGrants(expectOk(res).cedar_ember);
}

/** Parse the `cedar_ember` reset-grant block and pick the grant that can be spent now, if any. */
function parseClaudeGrants(block: unknown): ClaudeGrantStatus {
  if (!isRecord(block) || typeof block.eligible !== "boolean") throw new Error("Malformed reset-grant status");

  const now = Date.now();
  const grants = (Array.isArray(block.grants) ? block.grants : []).filter(isRecord);
  const grantsLeft = grants.reduce((sum, g) => sum + (num(g.resets_left) ?? 0), 0);
  const cooldownUntil = toMs(block.cooldown_until);
  const atLimit = block.at_limit === true;

  const usable = grants.filter((g) => {
    const startsAt = toMs(g.starts_at);
    const endsAt = toMs(g.ends_at);
    return (
      typeof g.id === "string" &&
      GRANT_ID_RE.test(g.id) &&
      g.paused !== true &&
      g.usable_now === true &&
      (num(g.resets_left) ?? 0) > 0 &&
      (g.use_requires_limit === false || atLimit) &&
      (!startsAt || startsAt <= now) &&
      (!endsAt || endsAt > now)
    );
  });
  const grant = usable.find((g) => g.id === block.next_grant_id) ?? usable[0];

  let blocker: string | null = null;
  if (!block.eligible) blocker = `Not eligible (${str(block.ineligible_reason) ?? "unknown"})`;
  else if (cooldownUntil && cooldownUntil > now)
    blocker = `On cooldown until ${new Date(cooldownUntil).toLocaleString()}`;
  else if (grantsLeft === 0) blocker = "No resets left";
  else if (!grant && !atLimit) blocker = "Only usable once a limit is hit";
  else if (!grant) blocker = "No grant usable right now";

  return { kind: "claude", grantsLeft, grantId: blocker === null && grant ? (grant.id as string) : null, blocker };
}

const CLAIM_ERRORS: Record<string, string> = {
  not_limited: "Account isn't rate limited",
  cooldown: "Reset is on cooldown",
  ineligible: "Account isn't eligible",
  unavailable: "Reset grant unavailable",
};

async function claimClaudeGrant(file: QuotaAccount): Promise<void> {
  // Re-read right before spending so we never claim against stale state.
  const status = await readClaudeGrants(file);
  if (!status.grantId) throw new Error(status.blocker ?? "No reset grant usable right now");

  const profile = expectOk(await upstream(file.auth_index, "GET", `${ANTHROPIC}/api/oauth/profile`, CLAUDE_HEADERS));
  const org = str(record(profile.organization).uuid);
  if (!org || !ORG_UUID_RE.test(org)) throw new Error("Could not resolve the Claude organization");

  let res: UpstreamResponse;
  try {
    res = await upstream(
      file.auth_index,
      "POST",
      `${ANTHROPIC}/api/organizations/${org}/reset_rate_limits`,
      CLAUDE_HEADERS,
      { program: "cedar_ember", grant_id: status.grantId, request_id: randomUUID() },
    );
  } catch {
    throw new Error("Reset outcome unknown, reload the quota before trying again");
  }
  if (res.status === 429) throw new Error("Rate limited by Anthropic, nothing was spent");
  if (res.status === 401 || res.status === 403) throw new Error("Anthropic rejected the account token");
  const result = record(res.body).result;
  if (result === "reset" || result === "already_used") return;
  if (typeof result === "string" && CLAIM_ERRORS[result]) throw new Error(CLAIM_ERRORS[result]);
  throw new Error("Reset outcome unknown, reload the quota before trying again");
}

// MARK: Helpers

function expectOk(res: UpstreamResponse): Record<string, unknown> {
  if (res.status < 200 || res.status >= 300) {
    const body = record(res.body);
    const message = isRecord(body.error) ? str(body.error.message) : (str(body.error) ?? str(body.message));
    throw new Error(message ? `${res.status} ${message}` : `Upstream HTTP ${res.status}`);
  }
  if (!isRecord(res.body)) throw new Error("Unexpected upstream response");
  return res.body;
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function num(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

/** Parses ISO strings, unix seconds or unix milliseconds into epoch ms. */
function toMs(value: unknown): number | null {
  const n = num(value);
  if (n !== null) return n > 0 ? (n < 1e12 ? n * 1000 : n) : null;
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}
