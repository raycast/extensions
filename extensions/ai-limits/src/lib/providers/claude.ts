import { Deps } from "../deps";
import { asArray, asNumber, asRecord, asString, asTimestamp, clampPercent, requestJson, titleCase } from "../http";
import { claudeKeychainService, readKeychainPassword } from "../keychain";
import { Balance, ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

const USAGE_URL = "https://api.anthropic.com/api/oauth/usage";
const CLAUDE_AI = "https://claude.ai/api/organizations";

// Claude Code rotates its refresh token on every refresh, so refreshing here would sign the CLI out. We only read the
// access token it already wrote and fall back to the browser session when it is stale.
const REFRESH_MARGIN_MS = 60_000;

const OAUTH_HINT =
  "Open Claude Code to refresh its login, then choose Connect Claude Code from this item's actions. " +
  "Or add your claude.ai session key in the extension preferences.";
const SESSION_HINT =
  "Choose Use Claude Session Key from this item's actions and paste a fresh sessionKey cookie, " +
  "or update the Claude Session Key preference.";
// Used when the key comes from the preference. The fallback action is hidden then, so the hint names the preference.
const SESSION_PREFERENCE_HINT = "Paste a fresh sessionKey cookie into the Claude Session Key preference";
const KEYCHAIN_DENIED_HINT =
  "Choose Connect Claude Code from this item's actions again.\n" +
  "When macOS asks for access to Claude Code's login, click Always Allow.";
const KEYCHAIN_NOT_CONNECTED_HINT =
  "Choose Connect Claude Code from this item's actions to sign in.\n" +
  "As a last resort, choose Use Claude Session Key from this item's actions instead.";
const NOT_CONNECTED_HINT =
  "Choose Connect Claude Code from this item's actions.\n" +
  "macOS asks once for access to Claude Code's login. Choose Always Allow.\n" +
  "As a last resort, choose Use Claude Session Key from this item's actions instead.";

const WINDOW_KEYS: [key: string, label: string][] = [
  ["five_hour", "Session"],
  ["seven_day", "Weekly"],
  ["seven_day_opus", "Weekly (Opus)"],
  ["seven_day_sonnet", "Weekly (Sonnet)"],
];

const PLAN_NAMES: Record<string, string> = {
  max: "Max",
  pro: "Pro",
  team: "Team",
  enterprise: "Enterprise",
};

interface OAuthCredential {
  accessToken: string;
  expiresAt?: number;
  scopes: string[];
  subscriptionType?: string;
  rateLimitTier?: string;
}

// Where a login was read from. The label is the source the usage shows.
type CredentialSource = "keychain" | "file";
const SOURCE_LABELS: Record<CredentialSource, string> = {
  keychain: "Claude Code (Keychain)",
  file: "Claude Code credentials",
};

type OAuthState =
  | { kind: "absent" }
  | { kind: "invalid"; from: CredentialSource }
  // macOS refused to give us the Keychain item, so there is no login to read.
  | { kind: "denied" }
  | { kind: "present"; from: CredentialSource; credential: OAuthCredential };

// A claude.ai session key, with the hint for when claude.ai rejects it.
interface SessionLogin {
  key: string;
  hint: string;
}

// The session key the settings give, if any. The hint names the preference when the key came from there, and the
// Use Claude Session Key action when it was saved by Connect.
function sessionLogin(settings: Settings): SessionLogin | undefined {
  const key = extractSessionKey(settings.claudeSessionKey);
  if (!key) {
    return undefined;
  }
  return { key, hint: settings.claudeSessionKeySource === "preference" ? SESSION_PREFERENCE_HINT : SESSION_HINT };
}

export async function fetchClaudeUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const session = sessionLogin(settings);
  const oauth = await readOAuthCredential(deps, settings);

  if (oauth.kind === "present") {
    const problem = checkOAuthUsable(oauth.credential, deps.now());
    if (problem) {
      if (!session) {
        throw new ProviderError("auth", problem.message, OAUTH_HINT);
      }
      return fallbackToSession(deps, session, problem.note);
    }
    try {
      return await fetchWithOAuth(deps, oauth.credential, oauth.from);
    } catch (error) {
      // Only a failed request can be retried on the web API. A usage body we can't read would fail the same way there.
      if (!session || !(error instanceof ProviderError) || (error.kind !== "auth" && error.kind !== "http")) {
        throw error;
      }
      return fallbackToSession(deps, session, oauthFailureNote(error));
    }
  }

  if (oauth.kind === "denied") {
    if (session) {
      return fallbackAfterDeniedKeychain(deps, session);
    }
    throw new ProviderError(
      "auth",
      "macOS denied access to Claude Code's login in the Keychain",
      KEYCHAIN_DENIED_HINT,
      undefined,
      "keychain-denied",
    );
  }

  if (session) {
    return fetchWithSession(deps, session, []);
  }
  if (oauth.kind === "invalid") {
    const where = oauth.from === "keychain" ? "Claude Code's Keychain login" : "Claude Code's credentials file";
    throw new ProviderError(
      "parse",
      `${where} isn't valid JSON`,
      "Sign in to Claude Code again, or add your claude.ai session key in the extension preferences",
    );
  }
  if (settings.claudeKeychain) {
    throw new ProviderError("not-connected", "Claude Code isn't signed in on this Mac", KEYCHAIN_NOT_CONNECTED_HINT);
  }
  throw new ProviderError("not-connected", "No Claude login found", NOT_CONNECTED_HINT);
}

// Accepts the bare value, `sessionKey=value`, or a whole Cookie header copied from the browser.
export function extractSessionKey(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const match = /(?:^|[\s;])sessionKey=([^;\s]+)/.exec(trimmed);
  return match ? match[1] : trimmed;
}

export function parseClaudeUsage(json: unknown): Pick<ProviderUsage, "windows" | "balances"> {
  const root = asRecord(json) ?? {};
  const windows: UsageWindow[] = [];

  for (const [key, label] of WINDOW_KEYS) {
    const window = asRecord(root[key]);
    const utilization = asNumber(window?.utilization);
    if (utilization === undefined) {
      continue;
    }
    windows.push({
      label,
      usedPercent: clampPercent(utilization),
      resetsAt: asTimestamp(window?.resets_at),
    });
  }

  // Newer responses list per-model limits here. Older ones only have the fixed keys above, so a model already
  // covered by a fixed key is not added twice.
  for (const entry of asArray(root.limits)) {
    const limit = asRecord(entry);
    const model = asRecord(asRecord(limit?.scope)?.model);
    const name = asString(model?.display_name);
    const percent = asNumber(limit?.percent);
    if (!limit || !name || percent === undefined) {
      continue;
    }
    const label = `Weekly (${name})`;
    if (windows.some((window) => window.label === label)) {
      continue;
    }
    windows.push({ label, usedPercent: clampPercent(percent), resetsAt: asTimestamp(limit.resets_at) });
  }

  const balances: Balance[] = [];
  const extra = asRecord(root.extra_usage);
  const monthlyLimit = asNumber(extra?.monthly_limit);
  if (extra?.is_enabled === true && monthlyLimit !== undefined && monthlyLimit > 0) {
    // Claude reports extra usage in cents, the rest of the extension uses dollars.
    balances.push({
      label: "Extra Usage",
      amount: (asNumber(extra.used_credits) ?? 0) / 100,
      limit: monthlyLimit / 100,
      currency: asString(extra.currency) ?? "USD",
    });
  }

  if (windows.length === 0 && balances.length === 0) {
    throw new ProviderError("parse", "Claude returned no usage data");
  }
  return { windows, balances };
}

// Returns why the OAuth token can't be used, or undefined when it can.
function checkOAuthUsable(credential: OAuthCredential, now: number): { message: string; note: string } | undefined {
  if (credential.expiresAt !== undefined && credential.expiresAt <= now + REFRESH_MARGIN_MS) {
    return { message: "Claude Code token expired", note: "Claude Code token expired, used claude.ai session" };
  }
  if (credential.scopes.length > 0 && !credential.scopes.includes("user:profile")) {
    return {
      message: "Claude Code login is missing the user:profile scope",
      note: "Claude Code login is missing the user:profile scope, used claude.ai session",
    };
  }
  return undefined;
}

async function readOAuthCredential(deps: Deps, settings: Settings): Promise<OAuthState> {
  // The folder Claude Code is signed in to: the one Connect saved from the user's shell, else Raycast's environment.
  const configDir = settings.claudeConfigDir || deps.env.CLAUDE_CONFIG_DIR;
  if (settings.claudeKeychain) {
    // Claude Code writes a fresh login to the Keychain and can leave the credentials file next to it stale, so the
    // Keychain is read first. A missing item, or one with no login in it, falls through to the file. A denied read does
    // not: the file may be the stale copy, and using it would show limits for a login Claude Code has already replaced.
    const keychain = await readKeychainPassword(deps, claudeKeychainService(configDir));
    if (keychain.kind === "denied") {
      return { kind: "denied" };
    }
    if (keychain.kind === "found") {
      const oauth = parseOAuthCredential(keychain.text, "keychain");
      if (oauth.kind !== "absent") {
        return oauth;
      }
    }
  }

  const folder = configDir || `${deps.homedir}/.claude`;
  const text = await deps.readFile(`${folder}/.credentials.json`);
  if (text === null) {
    return { kind: "absent" };
  }
  return parseOAuthCredential(text, "file");
}

// Parses the JSON that Claude Code stores, whether it came from the Keychain or from the credentials file.
function parseOAuthCredential(text: string, from: CredentialSource): OAuthState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "invalid", from };
  }

  const oauth = asRecord(asRecord(parsed)?.claudeAiOauth);
  const accessToken = asString(oauth?.accessToken);
  if (!oauth || !accessToken) {
    return { kind: "absent" };
  }
  return {
    kind: "present",
    from,
    credential: {
      accessToken,
      expiresAt: asNumber(oauth.expiresAt),
      scopes: asArray(oauth.scopes).filter((scope): scope is string => typeof scope === "string"),
      subscriptionType: asString(oauth.subscriptionType),
      rateLimitTier: asString(oauth.rateLimitTier),
    },
  };
}

async function fetchWithOAuth(deps: Deps, credential: OAuthCredential, from: CredentialSource): Promise<ProviderUsage> {
  const json = await requestJson(deps, USAGE_URL, {
    provider: "Claude",
    headers: {
      Authorization: `Bearer ${credential.accessToken}`,
      "anthropic-beta": "oauth-2025-04-20",
      "User-Agent": "AI-Limits-Raycast",
    },
    authHint: OAUTH_HINT,
  });
  const usage = parseClaudeUsage(json);
  return {
    provider: "claude",
    plan: planFromOAuth(credential),
    windows: usage.windows,
    balances: usage.balances,
    notes: [],
    source: SOURCE_LABELS[from],
    fetchedAt: deps.now(),
  };
}

function planFromOAuth(credential: OAuthCredential): string | undefined {
  return tierPlan(credential.rateLimitTier) ?? mapSubscription(credential.subscriptionType);
}

function mapSubscription(subscriptionType: string | undefined): string | undefined {
  if (!subscriptionType) {
    return undefined;
  }
  const key = subscriptionType.toLowerCase();
  return PLAN_NAMES[key] ?? titleCase(subscriptionType);
}

// Max plans carry their multiplier in the tier name, such as "default_claude_max_20x".
function tierPlan(tier: string | undefined): string | undefined {
  if (!tier) {
    return undefined;
  }
  if (tier.includes("max_20x")) {
    return "Max 20x";
  }
  if (tier.includes("max_5x")) {
    return "Max 5x";
  }
  return undefined;
}

// Used when the OAuth path fails. A session failure is the one the user can act on, so its message names the session.
async function fallbackToSession(deps: Deps, session: SessionLogin, note: string): Promise<ProviderUsage> {
  try {
    return await fetchWithSession(deps, session, [note]);
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new ProviderError(
        error.kind,
        `claude.ai session failed: ${error.message}`,
        error.hint,
        error.status,
        error.code,
        error.retryAt,
      );
    }
    throw error;
  }
}

// The session answers when macOS denied the Keychain read. Both outcomes carry the denial, so the UI turns the Keychain
// setting off. Otherwise every refresh would ask macOS again, even when the session works.
async function fallbackAfterDeniedKeychain(deps: Deps, session: SessionLogin): Promise<ProviderUsage> {
  try {
    const usage = await fallbackToSession(
      deps,
      session,
      "macOS denied access to Claude Code's Keychain login, used claude.ai session",
    );
    return { ...usage, keychainDenied: true };
  } catch (error) {
    if (error instanceof ProviderError) {
      throw new ProviderError(error.kind, error.message, error.hint, error.status, "keychain-denied", error.retryAt);
    }
    throw error;
  }
}

function oauthFailureNote(error: ProviderError): string {
  if (error.kind === "auth") {
    return "Claude Code token was rejected, used claude.ai session";
  }
  const reason = error.status !== undefined ? `HTTP ${error.status}` : "network error";
  return `Claude Code token couldn't be used (${reason}), used claude.ai session`;
}

async function fetchWithSession(deps: Deps, session: SessionLogin, notes: string[]): Promise<ProviderUsage> {
  const headers = {
    Cookie: `sessionKey=${session.key}`,
    "User-Agent": "AI-Limits-Raycast",
  };
  const organizations = await requestJson(deps, CLAUDE_AI, {
    provider: "Claude",
    headers,
    authHint: session.hint,
  });
  const org = chooseOrganization(organizations);
  const json = await requestJson(deps, `${CLAUDE_AI}/${encodeURIComponent(org.uuid)}/usage`, {
    provider: "Claude",
    headers,
    authHint: session.hint,
  });
  const usage = parseClaudeUsage(json);

  return {
    provider: "claude",
    plan: planFromOrganization(org),
    account: org.name,
    windows: usage.windows,
    balances: usage.balances,
    notes,
    source: "claude.ai session",
    fetchedAt: deps.now(),
  };
}

interface Organization {
  uuid: string;
  name?: string;
  capabilities: string[];
  rateLimitTier?: string;
}

// An account can belong to several organizations. The chat one is the personal account, which is the one whose usage
// the user means.
function chooseOrganization(json: unknown): Organization {
  const organizations = asArray(json)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => entry !== undefined && asString(entry.uuid) !== undefined)
    .map((entry) => ({
      uuid: asString(entry.uuid) as string,
      name: asString(entry.name),
      capabilities: asArray(entry.capabilities).filter((c): c is string => typeof c === "string"),
      rateLimitTier: asString(entry.rate_limit_tier),
    }));

  const org = organizations.find((candidate) => candidate.capabilities.includes("chat")) ?? organizations[0];
  if (!org) {
    throw new ProviderError("parse", "Claude returned no organizations for this session");
  }
  return org;
}

function planFromOrganization(org: Organization): string | undefined {
  if (org.capabilities.includes("claude_max")) {
    return tierPlan(org.rateLimitTier) ?? "Max";
  }
  if (org.capabilities.includes("claude_pro")) {
    return "Pro";
  }
  return undefined;
}
