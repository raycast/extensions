import { createHash } from "node:crypto";
import { setTimeout as wait } from "node:timers/promises";

export const periods = {
  all: "All-time",
  "180": "Last 180 Days",
  "90": "Last 90 Days",
  "30": "Last 30 Days",
  "7": "Last 7 Days",
  "1": "Last Day",
} as const;

export type Period = keyof typeof periods;
export type EarningsConfig = {
  source: "game" | "account";
  id: string;
  credential: string;
  period: Period;
};

export type EarningsPreferences = {
  earningsSource: string;
  earningsPeriod: string;
  universeId?: string;
  apiKey?: string;
  earningsUserId?: string;
  robloxSecurityCookie?: string;
};

export function earningsConfig(
  preferences: EarningsPreferences,
): EarningsConfig {
  const source = preferences.earningsSource;
  if (source !== "game" && source !== "account") {
    throw new Error("Choose an Earnings Source in settings.");
  }
  if (!Object.hasOwn(periods, preferences.earningsPeriod)) {
    throw new Error("Choose a Time Range in settings.");
  }
  const label = {
    game: "Universe ID",
    account: "Roblox User ID",
  }[source];
  const id = {
    game: preferences.universeId,
    account: preferences.earningsUserId,
  }[source]?.trim();
  if (!id) throw new Error(`Add ${label} in settings.`);
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    throw new Error(`${label} must be a positive number.`);
  }
  const credential = (
    source === "game" ? preferences.apiKey : preferences.robloxSecurityCookie
  )
    ?.trim()
    .replace(/^\.ROBLOSECURITY=/, "");
  if (!credential) {
    throw new Error(
      `Add ${source === "game" ? "API Key" : "Roblox Session Cookie"} in settings.`,
    );
  }
  if (
    /[\r\n]/.test(credential) ||
    (source !== "game" && /[;\s]/.test(credential))
  ) {
    throw new Error("Enter only the credential value in settings.");
  }
  return {
    source,
    id,
    credential,
    period: preferences.earningsPeriod as Period,
  };
}

// Credentials never appear in stored data or cache keys. A changed credential
// gets a separate cache, as do changes of source, ID, and reporting period.
export function earningsCacheKey(config: EarningsConfig) {
  return createHash("sha256").update(JSON.stringify(config)).digest("hex");
}

export const DEVEX_USD_RATE = 0.0038;

export function formatEarnings(robux: number, display: string) {
  return display === "usd"
    ? `≈${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(robux * DEVEX_USD_RATE)}`
    : robux.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const DAY = 86_400_000;
const ANALYTICS_URL = "https://apis.roblox.com/analytics-query-api/";

export function earningsWindow(period: Period, now: number, game = false) {
  // Roblox retains four years of game analytics. Never label an arbitrarily
  // truncated transaction scan as an all-time total.
  const earliestGameDate = new Date(now);
  earliestGameDate.setUTCFullYear(earliestGameDate.getUTCFullYear() - 4);
  return {
    start:
      period === "all"
        ? game
          ? earliestGameDate.getTime()
          : 0
        : now - Number(period) * DAY,
    end: now,
  };
}

export class EarningsRequestError extends Error {
  constructor(
    message: string,
    public retryAt = 0,
  ) {
    super(message);
  }
}

async function request(
  url: string,
  config: EarningsConfig,
  signal: AbortSignal,
  body?: object,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body ? "POST" : "GET",
      headers:
        config.source === "game"
          ? {
              "x-api-key": config.credential,
              "Content-Type": "application/json",
            }
          : { Cookie: `.ROBLOSECURITY=${config.credential}` },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "error",
      signal,
    });
  } catch {
    throw new Error("Unable to reach Roblox. Retrying on the next refresh.");
  }
  if (!response.ok) {
    // Keep Roblox's numeric error code, but never expose response bodies or
    // credentials.
    const failure: unknown = await response.json().catch(() => undefined);
    const details =
      record(failure) && Array.isArray(failure.errors)
        ? failure.errors.filter(record)
        : [];
    const code = details.find((error) => Number.isSafeInteger(error.code))
      ?.code as number | undefined;
    const transactionType = new URL(url).searchParams.get("transactionType");
    const context = transactionType ? ` ${transactionType}` : " earnings";
    const errors: Record<number, string> = {
      400: `Roblox rejected the ${config.source}${context} request (HTTP 400${code === undefined ? "" : `, code ${code}`}).`,
      401:
        config.source === "game"
          ? "Check your API Key in extension settings."
          : "Your Roblox session has expired. Update the session cookie in settings.",
      403:
        config.source === "game"
          ? "Grant universe.analytics:read to your API key for this game."
          : "Check that Roblox User ID and the session cookie belong to the same account.",
      404: "Earnings source not found. Check its ID and your access.",
      429: "Roblox rate limit reached. Waiting before the next refresh.",
    };
    const retryAfter = response.headers.get("retry-after");
    const seconds = Number(
      retryAfter ?? response.headers.get("x-ratelimit-reset") ?? 60,
    );
    const retryAt =
      response.status === 429
        ? Math.max(
            Date.now() + 60_000,
            Number.isFinite(seconds)
              ? Date.now() + seconds * 1000
              : Date.parse(retryAfter ?? "") || 0,
          )
        : 0;
    throw new EarningsRequestError(
      errors[response.status] ??
        `Unable to load earnings (Roblox ${response.status}).`,
      retryAt,
    );
  }
  try {
    return await response.json();
  } catch {
    throw new Error("Roblox returned an invalid earnings response.");
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function fetchGameEarnings(
  config: EarningsConfig,
  now = Date.now(),
) {
  const window = earningsWindow(config.period, now, true);
  const signal = AbortSignal.timeout(20_000);
  let operation = await request(
    `${ANALYTICS_URL}v1/universes/${config.id}/metrics`,
    config,
    signal,
    {
      metric: "DailyRevenue",
      granularity: "None",
      startTime: new Date(window.start).toISOString(),
      endTime: new Date(window.end).toISOString(),
    },
  );
  for (let attempt = 0; attempt <= 8; attempt++) {
    if (!record(operation))
      throw new Error("Roblox returned invalid game analytics.");
    if (operation.error)
      throw new Error(
        "Roblox could not complete the revenue query. Check analytics access in Creator Dashboard.",
      );
    if (operation.done === true) {
      const response = operation.response;
      if (!record(response) || !Array.isArray(response.values))
        throw new Error("Roblox returned invalid game analytics.");
      let total = 0;
      let count = 0;
      for (const series of response.values) {
        if (!record(series) || !Array.isArray(series.dataPoints))
          throw new Error("Roblox returned invalid revenue data.");
        for (const point of series.dataPoints) {
          if (
            !record(point) ||
            typeof point.value !== "number" ||
            !Number.isFinite(point.value)
          ) {
            throw new Error("Roblox returned an invalid revenue amount.");
          }
          total += point.value;
          count++;
        }
      }
      if (!count)
        throw new Error("No revenue data is available for this period yet.");
      if (!Number.isFinite(total))
        throw new Error("Roblox returned an invalid revenue total.");
      return total;
    }
    const path = operation.path;
    // Only poll the same universe on the fixed Roblox host. Never forward a key
    // to an arbitrary URL supplied in a response.
    if (
      operation.done !== false ||
      typeof path !== "string" ||
      !new RegExp(
        `^v1/universes/${config.id}/operations/metrics/[a-zA-Z0-9_-]+$`,
      ).test(path)
    ) {
      throw new Error("Roblox returned an invalid analytics operation.");
    }
    if (attempt === 8) break;
    await wait(1000, undefined, { signal });
    operation = await request(`${ANALYTICS_URL}${path}`, config, signal);
  }
  throw new Error(
    "Roblox is still preparing revenue data. Retrying on the next refresh.",
  );
}

// Income categories from Roblox's TransactionType schema. Purchased Robux,
// subscription stipends, transfers, trades, rebates, and spending are excluded.
// Incoming group payouts count toward account earnings.
const accountIncome = [
  "Sale",
  "AffiliateSale",
  "GroupPayout",
  "EngagementPayout",
  "GroupEngagementPayout",
  "AdsRevsharePayout",
  "GroupAdsRevsharePayout",
  "SubscriptionsRevsharePayout",
  "GroupSubscriptionsRevsharePayout",
  "AffiliatePayout",
  "LicensingPayment",
  "PrivateServerEngagementPayout",
  "SubscriptionReferralPayout",
  "CreatorRewardsPayout",
];

export type TransactionScan = {
  start: number;
  end: number;
  types: string[];
  typeIndex: number;
  cursor?: string;
  total: number;
  pages: number;
  seen: string[];
};

export type EarningsSnapshot = {
  total: number;
  asOf: number;
};

export type EarningsCache = {
  snapshot?: EarningsSnapshot;
  scan?: TransactionScan;
  nextRefreshAt?: number;
  error?: string;
};

// A finite page budget and checkpoints keep large histories progressing across
// Raycast launches. A total is published only after every category is complete.
// Rescanning also picks up corrections to older/pending transactions.
export async function syncTransactionEarnings(
  config: EarningsConfig,
  state: EarningsCache,
  save: () => void,
  now = Date.now(),
) {
  const signal = AbortSignal.timeout(20_000);
  let requests = 0;
  if (!state.scan) {
    const used = await request(
      `https://economy.roblox.com/v2/users/${config.id}/transaction-types`,
      config,
      signal,
    );
    requests++;
    if (
      !record(used) ||
      !Object.keys(used).some((key) => key.startsWith("Has")) ||
      Object.entries(used).some(
        ([key, value]) => key.startsWith("Has") && typeof value !== "boolean",
      )
    ) {
      throw new Error("Roblox returned invalid transaction categories.");
    }
    state.scan = {
      ...earningsWindow(config.period, now),
      types: accountIncome.filter((type) => used[`Has${type}`] === true),
      typeIndex: 0,
      total: 0,
      pages: 0,
      seen: [],
    };
    save();
  }
  const scan = state.scan;
  while (
    scan.typeIndex < scan.types.length &&
    requests < 8 &&
    !signal.aborted
  ) {
    const type = scan.types[scan.typeIndex];
    const params = new URLSearchParams({
      transactionType: type,
      limit: "100",
      sortOrder: "Desc",
    });
    if (scan.cursor) params.set("cursor", scan.cursor);
    requests++;
    const page = await request(
      `https://economy.roblox.com/v2/users/${config.id}/transactions?${params}`,
      config,
      signal,
    );
    if (
      !record(page) ||
      !Array.isArray(page.data) ||
      !(page.nextPageCursor === null || typeof page.nextPageCursor === "string")
    ) {
      throw new Error("Roblox returned invalid transaction history.");
    }
    const seen = new Set(scan.seen);
    let total = scan.total;
    let reachedStart = false;
    for (const transaction of page.data) {
      if (!record(transaction) || typeof transaction.created !== "string")
        throw new Error("Roblox returned an invalid transaction.");
      const created = Date.parse(transaction.created);
      if (!Number.isFinite(created))
        throw new Error("Roblox returned an invalid transaction date.");
      if (created < scan.start) {
        reachedStart = true;
        continue;
      }
      if (created >= scan.end) continue;
      const currency = transaction.currency;
      if (
        !record(currency) ||
        typeof currency.amount !== "number" ||
        !Number.isSafeInteger(currency.amount)
      ) {
        throw new Error("Roblox returned an invalid transaction amount.");
      }
      if (currency.type === "Tickets") continue;
      if (currency.type !== "Robux")
        throw new Error("Roblox returned an unknown transaction currency.");
      const id =
        typeof transaction.idHash === "string" && transaction.idHash
          ? transaction.idHash
          : Number.isSafeInteger(transaction.id)
            ? String(transaction.id)
            : undefined;
      if (!id) throw new Error("Roblox returned an invalid transaction ID.");
      if (seen.has(id)) continue;
      seen.add(id);
      total += currency.amount;
      if (!Number.isSafeInteger(total))
        throw new Error(
          "The revenue total is too large to display accurately.",
        );
    }
    const cursor = page.nextPageCursor;
    if (
      !reachedStart &&
      cursor &&
      (cursor === scan.cursor || page.data.length === 0)
    ) {
      throw new Error(
        "Roblox transaction pagination stalled. Retrying on the next refresh.",
      );
    }
    scan.total = total;
    scan.pages++;
    if (reachedStart || !cursor) {
      scan.typeIndex++;
      scan.cursor = undefined;
      scan.seen = [];
    } else {
      scan.cursor = cursor;
      scan.seen = [...seen];
    }
    save();
  }
  if (scan.typeIndex === scan.types.length) {
    state.snapshot = {
      total: scan.total,
      asOf: scan.end,
    };
    delete state.scan;
    save();
  }
}

export async function fetchEarningsSourceName(
  config: EarningsConfig,
): Promise<string> {
  const response = await fetch(
    config.source === "game"
      ? `https://games.roblox.com/v1/games?universeIds=${config.id}`
      : `https://users.roblox.com/v1/users/${config.id}`,
    { signal: AbortSignal.timeout(10_000), redirect: "error" },
  );
  if (!response.ok) throw new Error("Unable to load earnings source name.");
  const body: unknown = await response.json();
  const source =
    config.source === "game" && record(body) && Array.isArray(body.data)
      ? body.data.find(
          (game: unknown) => record(game) && String(game.id) === config.id,
        )
      : body;
  if (
    !record(source) ||
    String(source.id) !== config.id ||
    typeof source.name !== "string" ||
    !source.name.trim()
  ) {
    throw new Error("Roblox returned an invalid source name.");
  }
  return source.name;
}
