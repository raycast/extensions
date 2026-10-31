import { Deps } from "../deps";
import {
  asNumber,
  asRecord,
  asString,
  asTimestamp,
  clampPercent,
  decodeJwtPayload,
  requestJson,
  titleCase,
} from "../http";
import { formatMoney } from "../format";
import { Balance, ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

const USAGE_URL = "https://cursor.com/api/usage-summary";
const ME_URL = "https://cursor.com/api/auth/me";
const COOKIE_NAME = "WorkosCursorSessionToken";
export const STATE_DB = "/Library/Application Support/Cursor/User/globalStorage/state.vscdb";
export const TOKEN_QUERY = "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1;";

// The app's access token is refused when it expires within a minute, so a request doesn't start with a token that
// expires mid-flight.
const EXPIRY_MARGIN_SECONDS = 60;

const SIGN_IN_HINT =
  "Choose Connect Cursor from this item's actions.\n" +
  'Or paste the WorkosCursorSessionToken cookie from cursor.com (Developer Tools > Application > Cookies) into the "Cursor Session Cookie" preference';
const COOKIE_AUTH_HINT =
  "Choose Use Cursor Session Cookie from this item's actions and paste a fresh WorkosCursorSessionToken cookie from " +
  'cursor.com, or update the "Cursor Session Cookie" preference';
// Used when the cookie comes from the preference. The fallback action is hidden then, so the hint names the preference.
const COOKIE_PREFERENCE_HINT =
  'Paste a fresh WorkosCursorSessionToken cookie from cursor.com into the "Cursor Session Cookie" preference';
const APP_AUTH_HINT = "Open Cursor to refresh its login";

interface CursorSession {
  // The value of the WorkosCursorSessionToken cookie.
  cookie: string;
  source: "Cursor session cookie" | "Cursor app";
  authHint: string;
}

export interface CursorUsage {
  plan?: string;
  windows: UsageWindow[];
  balances: Balance[];
}

export async function fetchCursorUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const session = await resolveSession(deps, settings);
  const headers = { Cookie: `${COOKIE_NAME}=${session.cookie}` };

  // The account lookup is decoration, so its failure must not hide the usage numbers.
  const [summaryJson, meJson] = await Promise.all([
    requestJson(deps, USAGE_URL, { headers, provider: "Cursor", authHint: session.authHint }),
    requestJson(deps, ME_URL, { headers, provider: "Cursor" }).catch(() => undefined),
  ]);

  const usage = parseCursorUsageSummary(summaryJson);
  const me = asRecord(meJson);
  return {
    provider: "cursor",
    plan: usage.plan,
    account: asString(me?.email) ?? asString(me?.name),
    windows: usage.windows,
    balances: usage.balances,
    notes: [],
    source: session.source,
    fetchedAt: deps.now(),
  };
}

// A manual cookie wins over the app's login, so a user can override a stale Cursor app login.
async function resolveSession(deps: Deps, settings: Settings): Promise<CursorSession> {
  const manual = extractManualCookie(settings.cursorCookie);
  if (manual) {
    const authHint = settings.cursorCookieSource === "preference" ? COOKIE_PREFERENCE_HINT : COOKIE_AUTH_HINT;
    return { cookie: manual, source: "Cursor session cookie", authHint };
  }
  return { cookie: await appSessionCookie(deps), source: "Cursor app", authHint: APP_AUTH_HINT };
}

// Accepts the bare value, the "WorkosCursorSessionToken=<value>" pair, or a whole Cookie header containing it.
function extractManualCookie(raw: string | undefined): string | undefined {
  const value = asString(raw);
  if (!value) {
    return undefined;
  }
  const match = new RegExp(`(?:^|;)\\s*${COOKIE_NAME}=([^;\\s]+)`).exec(value);
  return match ? match[1] : value;
}

// The Cursor app stores its access token (a JWT) in its SQLite state. Its user id is the part of the `sub` claim after
// the last "|", and the web session cookie is "<userId>::<token>" URL-encoded.
async function appSessionCookie(deps: Deps): Promise<string> {
  const notConnected = new ProviderError("not-connected", "Cursor isn't signed in on this Mac", SIGN_IN_HINT);

  let output: string;
  try {
    output = await deps.sqlite(deps.homedir + STATE_DB, TOKEN_QUERY);
  } catch {
    // No database means the app was never signed in.
    throw notConnected;
  }
  const accessToken = output.trim();
  if (!accessToken) {
    throw notConnected;
  }

  const payload = decodeJwtPayload(accessToken);
  const sub = asString(payload?.sub) ?? "";
  const userId = sub.slice(sub.lastIndexOf("|") + 1);
  const exp = asNumber(payload?.exp);
  if (!userId || exp === undefined || exp <= deps.now() / 1000 + EXPIRY_MARGIN_SECONDS) {
    throw new ProviderError("auth", "Cursor app login expired", APP_AUTH_HINT);
  }
  return `${userId}%3A%3A${accessToken}`;
}

// Parses /api/usage-summary. Percent fields are already percents, and money is in cents.
export function parseCursorUsageSummary(json: unknown): CursorUsage {
  const root = asRecord(json);
  const individual = asRecord(root?.individualUsage);
  const plan = asRecord(individual?.plan);
  const onDemand = asRecord(individual?.onDemand);
  const overall = asRecord(individual?.overall);
  const team = asRecord(root?.teamUsage);
  const teamOnDemand = asRecord(team?.onDemand);
  const pooled = asRecord(team?.pooled);
  const resetsAt = asTimestamp(root?.billingCycleEnd);

  const windows: UsageWindow[] = [];
  const balances: Balance[] = [];

  // The plan percent is the provider's own total when it sends one. Otherwise it is derived from the sub-percents or
  // the cents, from the most specific source to the least.
  const auto = asNumber(plan?.autoPercentUsed);
  const api = asNumber(plan?.apiPercentUsed);
  const planPercent =
    asNumber(plan?.totalPercentUsed) ??
    (auto !== undefined && api !== undefined ? (auto + api) / 2 : (auto ?? api)) ??
    ratioPercent(plan) ??
    ratioPercent(overall) ??
    ratioPercent(pooled);
  if (planPercent !== undefined) {
    windows.push({
      label: "Plan",
      usedPercent: clampPercent(planPercent),
      resetsAt,
      detail: moneyDetail(plan) ?? moneyDetail(overall) ?? moneyDetail(pooled),
    });
  }
  if (auto !== undefined) {
    windows.push({ label: "Auto", usedPercent: clampPercent(auto), resetsAt });
  }
  if (api !== undefined) {
    windows.push({ label: "API Models", usedPercent: clampPercent(api), resetsAt });
  }

  const onDemandUsed = asNumber(onDemand?.used) ?? 0;
  if (onDemand && (onDemand.enabled === true || onDemandUsed > 0)) {
    // A zero cap means there is no cap to show, so it is left out rather than shown as "of $0.00".
    const limit = asNumber(onDemand.limit);
    balances.push({
      label: "On-Demand",
      amount: onDemandUsed / 100,
      currency: "USD",
      ...(limit !== undefined && limit > 0 ? { limit: limit / 100 } : {}),
      resetsAt,
    });
  }
  const teamLimit = asNumber(teamOnDemand?.limit);
  if (teamLimit !== undefined && teamLimit > 0) {
    balances.push({
      label: "Team On-Demand",
      amount: (asNumber(teamOnDemand?.used) ?? 0) / 100,
      currency: "USD",
      limit: teamLimit / 100,
      resetsAt,
    });
  }

  if (windows.length === 0 && balances.length === 0) {
    throw new ProviderError("parse", "Cursor's usage response had no usable limits");
  }
  const membership = asString(root?.membershipType);
  return { plan: membership ? titleCase(membership) : undefined, windows, balances };
}

function ratioPercent(source: Record<string, unknown> | undefined): number | undefined {
  const used = asNumber(source?.used);
  const limit = asNumber(source?.limit);
  return used !== undefined && limit !== undefined && limit > 0 ? (used / limit) * 100 : undefined;
}

// "$15.00 / $20.00" for a cents source with a limit, or undefined.
function moneyDetail(source: Record<string, unknown> | undefined): string | undefined {
  const used = asNumber(source?.used);
  const limit = asNumber(source?.limit);
  if (used === undefined || limit === undefined || limit <= 0) {
    return undefined;
  }
  return `${formatMoney(used / 100, "USD")} / ${formatMoney(limit / 100, "USD")}`;
}
