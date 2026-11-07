import { Deps } from "../deps";
import { asArray, asNumber, asRecord, asString, asTimestamp, clampPercent, requestJson } from "../http";
import { ProviderError, ProviderUsage, Settings, UsageWindow } from "../types";

const GLOBAL_QUOTA_URL = "https://api.z.ai/api/monitor/usage/quota/limit";
// The China console serves the same quota path on the BigModel host.
const CHINA_QUOTA_URL = "https://open.bigmodel.cn/api/monitor/usage/quota/limit";
export const CREATE_KEY_URL = "https://z.ai/manage-apikey/apikey-list";
const AUTH_HINT =
  "Choose Connect z.ai from this item's actions to enter a new key, or check the key in the extension preferences";
// Used when the key comes from the preferences. Connect is hidden then, so the hint doesn't name it.
const PREFERENCE_AUTH_HINT = "Check the z.ai API key in the extension preferences";
const CODING_PLAN_HINT = "Check that this key belongs to a GLM Coding Plan";

// Codes in the response envelope that mean the key was refused. Other codes are reported as plain HTTP errors.
const AUTH_CODES = new Set([401, 403]);
const KNOWN_TYPES = new Set(["TOKENS_LIMIT", "CREDIT_LIMIT", "TIME_LIMIT"]);
// Minutes per unit code. Units come from z.ai's quota API.
const MINUTES_PER_UNIT: Record<number, number> = { 1: 1440, 3: 60, 5: 1, 6: 10080 };
const UNIT_NAMES: Record<number, string> = { 1: "Day", 3: "Hour", 5: "Minute", 6: "Week" };
// TIME_LIMIT with unit 5 and number 1 is the monthly MCP allowance, which the API marks this way.
const MONTHLY_MINUTES = 30 * 24 * 60;
const FIVE_HOUR_MINUTES = 300;
// Resets for a 5-hour window can't be further away than the window itself. Anything beyond this is a timezone error.
const FIVE_HOUR_RESET_SLACK_MS = (5 * 3600 + 60) * 1000;

interface ZaiLimit {
  type: string;
  usage?: number;
  currentValue?: number;
  remaining?: number;
  percentage?: number;
  unit?: number;
  number?: number;
  resetsAt: number | null;
}

export async function fetchZaiUsage(deps: Deps, settings: Settings): Promise<ProviderUsage> {
  const apiKey = settings.zaiApiKey?.trim();
  if (!apiKey) {
    throw new ProviderError(
      "not-connected",
      "No z.ai API key",
      "Choose Connect z.ai from this item's actions.\n" +
        `Or add your z.ai API key in the extension preferences. Create one at ${CREATE_KEY_URL}`,
    );
  }

  const url = settings.zaiRegion === "china" ? CHINA_QUOTA_URL : GLOBAL_QUOTA_URL;
  const authHint = settings.zaiApiKeySource === "preference" ? PREFERENCE_AUTH_HINT : AUTH_HINT;
  const json = await requestJson(deps, url, {
    provider: "z.ai",
    headers: { Authorization: `Bearer ${apiKey}` },
    authHint,
  });
  return parseZaiUsage(json, deps.now(), authHint);
}

// `authHint` is what a rejected key is told to do, and it depends on where the key came from.
export function parseZaiUsage(json: unknown, fetchedAt: number, authHint = AUTH_HINT): ProviderUsage {
  const root = asRecord(json);
  if (!root) {
    throw new ProviderError("parse", "z.ai returned an unexpected response");
  }
  // The answer is only trusted when both the envelope flag and its code say success.
  if (root.success !== true || asNumber(root.code) !== 200) {
    const code = asNumber(root.code);
    if (code !== undefined && AUTH_CODES.has(code)) {
      throw new ProviderError("auth", `z.ai rejected the API key (code ${code})`, authHint);
    }
    throw new ProviderError("http", `z.ai quota API error: ${asString(root.msg) ?? "invalid response"}`);
  }

  const data = asRecord(root.data);
  if (!data || !Array.isArray(data.limits)) {
    throw new ProviderError("parse", "Unsupported z.ai quota format");
  }
  if (data.limits.length === 0) {
    throw new ProviderError("parse", "z.ai returned no Coding Plan limits", CODING_PLAN_HINT);
  }

  const limits = asArray(data.limits)
    .map(parseLimit)
    .filter((limit): limit is ParsedLimit => limit !== undefined);
  const windows = limits.sort((a, b) => sortKey(a) - sortKey(b)).map((limit) => toWindow(limit, fetchedAt));
  if (windows.length === 0) {
    throw new ProviderError("parse", "z.ai returned no usable Coding Plan limits", CODING_PLAN_HINT);
  }

  const plan = [data.planName, data.plan, data.plan_type, data.packageName, data.level]
    .map(asString)
    .find((value) => value !== undefined);

  return {
    provider: "zai",
    plan,
    windows,
    balances: [],
    notes: [],
    source: "API key",
    fetchedAt,
  };
}

interface ParsedLimit extends ZaiLimit {
  minutes?: number;
  percent: number;
}

function parseLimit(raw: unknown): ParsedLimit | undefined {
  const record = asRecord(raw);
  const type = asString(record?.type);
  if (!record || !type || !KNOWN_TYPES.has(type)) {
    return undefined;
  }
  const limit: ZaiLimit = {
    type,
    usage: asNumber(record.usage),
    currentValue: asNumber(record.currentValue),
    remaining: asNumber(record.remaining),
    percentage: asNumber(record.percentage),
    unit: asNumber(record.unit),
    number: asNumber(record.number),
    resetsAt: asTimestamp(record.nextResetTime),
  };
  const percent = usedPercent(limit);
  if (percent === undefined) {
    return undefined;
  }
  return { ...limit, percent, minutes: windowMinutes(limit) };
}

// Counts beat the server's percentage when a limit is known. The percentage is kept as a fallback for limits that
// only report that.
function usedPercent(limit: ZaiLimit): number | undefined {
  const { usage, currentValue, remaining } = limit;
  if (usage !== undefined && usage > 0) {
    let used: number | undefined;
    if (remaining !== undefined) {
      used = Math.max(usage - remaining, currentValue ?? usage - remaining);
    } else {
      used = currentValue;
    }
    if (used !== undefined) {
      return clampPercent((Math.max(0, Math.min(usage, used)) / usage) * 100);
    }
  }
  return limit.percentage === undefined ? undefined : clampPercent(limit.percentage);
}

function windowMinutes(limit: ZaiLimit): number | undefined {
  if (limit.type === "TIME_LIMIT" && limit.unit === 5 && limit.number === 1) {
    return MONTHLY_MINUTES;
  }
  const perUnit = limit.unit !== undefined ? MINUTES_PER_UNIT[limit.unit] : undefined;
  if (limit.number === undefined || limit.number <= 0 || perUnit === undefined) {
    return undefined;
  }
  return limit.number * perUnit;
}

function toWindow(limit: ParsedLimit, fetchedAt: number): UsageWindow {
  // Resets that are impossible for a 5-hour window are dropped rather than shown as a wrong time.
  const isImpossibleReset =
    limit.type !== "TIME_LIMIT" &&
    limit.minutes === FIVE_HOUR_MINUTES &&
    limit.resetsAt !== null &&
    limit.resetsAt > fetchedAt + FIVE_HOUR_RESET_SLACK_MS;

  const window: UsageWindow = {
    label: windowLabel(limit),
    usedPercent: limit.percent,
    resetsAt: isImpossibleReset ? null : limit.resetsAt,
  };
  const used =
    limit.currentValue ??
    (limit.remaining !== undefined && limit.usage !== undefined ? limit.usage - limit.remaining : undefined);
  if (limit.usage !== undefined && limit.usage > 0 && used !== undefined) {
    window.detail = `${used} / ${limit.usage}`;
  }
  return window;
}

function windowLabel(limit: ParsedLimit): string {
  if (limit.type === "TIME_LIMIT") {
    return limit.minutes === MONTHLY_MINUTES ? "MCP (Monthly)" : "MCP";
  }
  if (limit.minutes === FIVE_HOUR_MINUTES) {
    return "5-Hour";
  }
  if (limit.minutes === 10080) {
    return "Weekly";
  }
  if (limit.minutes === MONTHLY_MINUTES) {
    return "Monthly";
  }
  const unitName = limit.unit !== undefined ? UNIT_NAMES[limit.unit] : undefined;
  if (limit.number === undefined || !unitName) {
    return "Quota";
  }
  return `${limit.number} ${unitName}${limit.number === 1 ? "" : "s"}`;
}

// Token and credit windows come first, shortest first. The MCP allowance goes last.
function sortKey(limit: ParsedLimit): number {
  if (limit.type === "TIME_LIMIT") {
    return Number.MAX_SAFE_INTEGER;
  }
  return limit.minutes ?? Number.MAX_SAFE_INTEGER - 1;
}
