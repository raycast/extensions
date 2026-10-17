import { Deps } from "../deps";
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  asTimestamp,
  clampPercent,
  decodeJwtPayload,
  requestJson,
  titleCase,
} from "../http";
import { Balance, ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";
const AUTH_HINT = "Run `codex` in a terminal to refresh your login";
// The CLI refreshes its tokens about every 8 days. A login older than that is the likely cause of a 401.
const STALE_LOGIN_MS = 8 * 24 * 60 * 60 * 1000;
const STALE_HINT = "Your Codex login is more than 8 days old. Run `codex` in a terminal to refresh it";
const NOT_CONNECTED_HINT =
  "Choose Connect Codex from this item's actions.\n" +
  "Or install the Codex CLI, then run `codex login` to sign in with ChatGPT";

// Codex keeps the ChatGPT account id in a namespaced claim of its id_token.
const AUTH_CLAIM = "https://api.openai.com/auth";

const DAY_SECONDS = 86_400;
const WEEK_SECONDS = 604_800;

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
  edu: "Edu",
};

interface CodexTokens {
  accessToken: string;
  idToken?: string;
  accountId?: string;
  // When the CLI last refreshed its login, in epoch milliseconds, or null when auth.json doesn't say.
  lastRefresh: number | null;
}

// Refresh tokens are deliberately not read. The Codex CLI rotates them, and refreshing here would sign it out.
// The only setting is the folder the login is in, which Connect saves from the user's shell.
export async function fetchCodexUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const tokens = await readTokens(deps, settings);

  const idPayload = tokens.idToken ? decodeJwtPayload(tokens.idToken) : undefined;
  const authClaim = asRecord(idPayload?.[AUTH_CLAIM]);
  const accountId = tokens.accountId ?? asString(authClaim?.chatgpt_account_id);
  const email = asString(idPayload?.email);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.accessToken}`,
    "User-Agent": "AI-Limits-Raycast",
  };
  if (accountId) {
    headers["ChatGPT-Account-Id"] = accountId;
  }

  // The hint only shows on a 401 or 403. A stale login is the likely reason for those, so the hint says so.
  const stale = tokens.lastRefresh !== null && deps.now() - tokens.lastRefresh > STALE_LOGIN_MS;
  const json = await requestJson(deps, USAGE_URL, {
    provider: "Codex",
    headers,
    authHint: stale ? STALE_HINT : AUTH_HINT,
  });
  const usage = parseCodexUsage(json);
  return {
    provider: "codex",
    plan: usage.plan,
    account: email,
    windows: usage.windows,
    balances: usage.balances,
    notes: usage.notes,
    source: "Codex CLI login",
    fetchedAt: deps.now(),
  };
}

async function readTokens(deps: Deps, settings: Settings): Promise<CodexTokens> {
  // The folder Codex is signed in to: the one Connect saved from the user's shell, else Raycast's environment.
  const home = settings.codexHome || deps.env.CODEX_HOME || `${deps.homedir}/.codex`;
  const text = await deps.readFile(`${home}/auth.json`);
  if (text === null) {
    throw new ProviderError("not-connected", "No Codex login found", NOT_CONNECTED_HINT);
  }

  let auth: Record<string, unknown> | undefined;
  try {
    auth = asRecord(JSON.parse(text));
  } catch {
    throw new ProviderError("parse", "Codex's auth.json isn't valid JSON");
  }
  if (!auth) {
    throw new ProviderError("parse", "Codex's auth.json isn't a JSON object");
  }

  const tokens = asRecord(auth.tokens);
  const accessToken = asString(tokens?.access_token ?? tokens?.accessToken);
  if (!accessToken) {
    if (asString(auth.OPENAI_API_KEY)) {
      throw new ProviderError(
        "not-connected",
        "Codex is using an API key",
        "Plan limits need a ChatGPT login. Run `codex login` and choose Sign in with ChatGPT",
      );
    }
    throw new ProviderError("not-connected", "No Codex login found", NOT_CONNECTED_HINT);
  }

  return {
    accessToken,
    idToken: asString(tokens?.id_token ?? tokens?.idToken),
    accountId: asString(tokens?.account_id ?? tokens?.accountId),
    lastRefresh: asTimestamp(auth.last_refresh),
  };
}

export function parseCodexUsage(json: unknown): {
  plan?: string;
  windows: UsageWindow[];
  balances: Balance[];
  notes: string[];
} {
  const root = asRecord(json) ?? {};
  const windows: UsageWindow[] = [];
  const notes: string[] = [];
  const balances: Balance[] = [];

  windows.push(...readWindows(root.rate_limit, ""));

  for (const entry of asArray(root.additional_rate_limits)) {
    const limit = asRecord(entry);
    const name = asString(limit?.limit_name);
    if (!name) {
      continue;
    }
    windows.push(...readWindows(limit?.rate_limit, `${name} `));
  }

  const credits = asRecord(root.credits);
  if (credits?.unlimited === true) {
    notes.push("Unlimited credits");
  } else if (credits?.has_credits === true) {
    const balance = asNumber(credits.balance);
    if (balance !== undefined) {
      balances.push({ label: "Credits", amount: balance, currency: "credits" });
    }
  }

  if (windows.length === 0 && balances.length === 0 && notes.length === 0) {
    throw new ProviderError("parse", "Codex returned no usage data");
  }
  return { plan: planName(asString(root.plan_type)), windows, balances, notes };
}

// Reads the primary and secondary windows of one rate limit. `prefix` is set for additional limits, so their labels
// say which model they belong to.
function readWindows(rateLimit: unknown, prefix: string): UsageWindow[] {
  const limit = asRecord(rateLimit);
  const windows: UsageWindow[] = [];
  const primary = readWindow(limit?.primary_window, "Session", prefix);
  const secondary = readWindow(limit?.secondary_window, "Weekly", prefix);
  if (primary) {
    windows.push(primary);
  }
  if (secondary) {
    windows.push(secondary);
  }
  return windows;
}

function readWindow(value: unknown, fallbackLabel: string, prefix: string): UsageWindow | undefined {
  const window = asRecord(value);
  const usedPercent = asNumber(window?.used_percent);
  if (usedPercent === undefined) {
    return undefined;
  }
  // Without a window length, the position is the best guess: the primary window is the short one.
  const seconds = asNumber(window?.limit_window_seconds);
  const label = seconds === undefined ? fallbackLabel : windowLabel(seconds);
  return {
    label: `${prefix}${label}`,
    usedPercent: clampPercent(usedPercent),
    // Codex sends reset_at in epoch seconds, which asTimestamp converts.
    resetsAt: asTimestamp(window?.reset_at),
  };
}

function windowLabel(seconds: number): string {
  if (seconds <= DAY_SECONDS) {
    return "Session";
  }
  if (Math.abs(seconds - WEEK_SECONDS) <= DAY_SECONDS) {
    return "Weekly";
  }
  return `${Math.round(seconds / DAY_SECONDS)}-Day`;
}

function planName(planType: string | undefined): string | undefined {
  if (!planType) {
    return undefined;
  }
  return PLAN_NAMES[planType.toLowerCase()] ?? titleCase(planType);
}
