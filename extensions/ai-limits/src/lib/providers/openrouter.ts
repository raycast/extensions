import { Deps } from "../deps";
import { formatMoney } from "../format";
import { asNumber, asRecord, asString, clampPercent, requestJson, titleCase } from "../http";
import { Balance, ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

const KEY_URL = "https://openrouter.ai/api/v1/key";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";
export const CREATE_KEY_URL = "https://openrouter.ai/settings/keys";
const AUTH_HINT =
  "Choose Connect OpenRouter from this item's actions to sign in again, or check the key in the extension preferences";
// Used when the key comes from the preferences. Connect is hidden then, so the hint doesn't name it.
const PREFERENCE_AUTH_HINT = "Check the OpenRouter API key in the extension preferences";
// Sent on every call. OpenRouter shows the title on its activity pages, so it says which app made the requests.
const APP_HEADERS = { "X-Title": "AI Limits", "HTTP-Referer": "https://raycast.com" };

// The /key answer, with the fields the window and spend notes read. Undefined means OpenRouter sent null or nothing.
export interface OpenRouterKey {
  limit?: number;
  limitRemaining?: number;
  limitReset?: string;
  usage?: number;
  usageDaily?: number;
  usageWeekly?: number;
  usageMonthly?: number;
  isFreeTier: boolean;
}

export interface OpenRouterCredits {
  totalCredits: number;
  totalUsage: number;
}

export function parseOpenRouterKey(json: unknown): OpenRouterKey {
  const data = asRecord(asRecord(json)?.data);
  if (!data) {
    throw new ProviderError("parse", "OpenRouter returned an unexpected key response");
  }
  return {
    limit: asNumber(data.limit),
    limitRemaining: asNumber(data.limit_remaining),
    limitReset: asString(data.limit_reset),
    usage: asNumber(data.usage),
    usageDaily: asNumber(data.usage_daily),
    usageWeekly: asNumber(data.usage_weekly),
    usageMonthly: asNumber(data.usage_monthly),
    isFreeTier: data.is_free_tier === true,
  };
}

export function parseOpenRouterCredits(json: unknown): OpenRouterCredits {
  const data = asRecord(asRecord(json)?.data);
  const totalCredits = asNumber(data?.total_credits);
  const totalUsage = asNumber(data?.total_usage);
  if (totalCredits === undefined || totalUsage === undefined) {
    throw new ProviderError("parse", "OpenRouter returned an unexpected credits response");
  }
  return { totalCredits, totalUsage };
}

// Reads the optional key limit. Uncapped keys (limit null) have no window, only spend notes.
function keyLimitWindows(key: OpenRouterKey): UsageWindow[] {
  if (key.limit === undefined || key.limit <= 0) {
    return [];
  }
  // Prefer OpenRouter's remaining figure. Fall back to usage when it is missing.
  const rawUsed = key.limitRemaining !== undefined ? key.limit - key.limitRemaining : key.usage;
  if (rawUsed === undefined) {
    return [];
  }
  const used = Math.min(Math.max(rawUsed, 0), key.limit);
  const label = key.limitReset ? `Key Limit (${titleCase(key.limitReset)})` : "Key Limit";
  return [
    {
      label,
      usedPercent: clampPercent((used / key.limit) * 100),
      resetsAt: null,
      detail: `${formatMoney(used, "USD")} / ${formatMoney(key.limit, "USD")}`,
    },
  ];
}

// "Spent today $1.20 · this week $5.00 · this month $20.00", with only the periods OpenRouter reported.
function spendNote(key: OpenRouterKey): string | undefined {
  const parts: string[] = [];
  if (key.usageDaily !== undefined) {
    parts.push(`Spent today ${formatMoney(key.usageDaily, "USD")}`);
  }
  if (key.usageWeekly !== undefined) {
    parts.push(`this week ${formatMoney(key.usageWeekly, "USD")}`);
  }
  if (key.usageMonthly !== undefined) {
    parts.push(`this month ${formatMoney(key.usageMonthly, "USD")}`);
  }
  return parts.length ? parts.join(" · ") : undefined;
}

export async function fetchOpenRouterUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const apiKey = settings.openrouterApiKey?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "not-connected",
      "No OpenRouter API key",
      "Choose Connect OpenRouter from this item's actions.\n" +
        `Or add your OpenRouter API key in the extension preferences. Create one at ${CREATE_KEY_URL}`,
    );
  }

  const options = {
    provider: "OpenRouter",
    headers: { Authorization: `Bearer ${apiKey}`, ...APP_HEADERS },
    authHint: settings.openrouterApiKeySource === "preference" ? PREFERENCE_AUTH_HINT : AUTH_HINT,
  };
  // The key call is the one that matters. Credits are only a bonus, since keys without credits access can't read them.
  const [keyResult, creditsResult] = await Promise.allSettled([
    requestJson(deps, KEY_URL, options).then(parseOpenRouterKey),
    requestJson(deps, CREDITS_URL, options).then(parseOpenRouterCredits),
  ]);
  if (keyResult.status === "rejected" && creditsResult.status === "rejected") {
    throw keyResult.reason;
  }

  const notes: string[] = [];
  const key = keyResult.status === "fulfilled" ? keyResult.value : undefined;
  if (!key && keyResult.status === "rejected") {
    notes.push(
      `Key limits unavailable: ${keyResult.reason instanceof Error ? keyResult.reason.message : "unknown error"}`,
    );
  }
  const credits = creditsResult.status === "fulfilled" ? creditsResult.value : undefined;
  if (!credits) {
    notes.push(creditsNote(creditsResult.status === "rejected" ? creditsResult.reason : undefined));
  }

  const spend = key ? spendNote(key) : undefined;
  if (spend) {
    notes.push(spend);
  }

  const balances: Balance[] = credits
    ? [{ label: "Balance", amount: Math.max(0, credits.totalCredits - credits.totalUsage), currency: "USD" }]
    : [];

  return {
    provider: "openrouter",
    plan: key?.isFreeTier ? "Free tier" : undefined,
    windows: key ? keyLimitWindows(key) : [],
    balances,
    notes,
    source: "API key",
    fetchedAt: deps.now(),
  };
}

// Only a refused key means the key lacks credits access. Other failures say the balance is just unavailable.
function creditsNote(reason: unknown): string {
  if (reason instanceof ProviderError && reason.kind === "auth") {
    return "Credit balance needs a key with credits access";
  }
  return "Credit balance unavailable";
}
