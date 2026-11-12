import { Color } from "@raycast/api";
import { MOCK_API, MOCK_CONFIG } from "../mocks/config";
import { AccountType } from "../types";

/** Mock data is stored apart from real data, so turning mocks off leaves the real caches untouched. */
const STORAGE_PREFIX = MOCK_API ? "mock:" : "";

export const STORAGE_KEYS = {
  clientInfo: `${STORAGE_PREFIX}clientInfo`,
  rates: `${STORAGE_PREFIX}rates`,
  pinnedAccounts: `${STORAGE_PREFIX}pinnedAccounts`,
  pinnedRates: `${STORAGE_PREFIX}pinnedRates`,
  statementRequestedAt: `${STORAGE_PREFIX}statementRequestedAt`,
  statementPeriod: `${STORAGE_PREFIX}statementPeriod`,
  statementAccount: `${STORAGE_PREFIX}statementAccount`,
  menuBarRate: `${STORAGE_PREFIX}menuBarRate`,
  menuBarJar: `${STORAGE_PREFIX}menuBarJar`,
  rateHistory: `${STORAGE_PREFIX}rateHistory`,
  budgets: `${STORAGE_PREFIX}budgets`,
  /** The ids of the accounts budgets count, or nothing to use the default ones (see `resolveBudgetAccounts`). */
  budgetAccounts: `${STORAGE_PREFIX}budgetAccounts`,
  /** Renamed and hidden subscriptions, by `Subscription.key`. */
  subscriptionOverrides: `${STORAGE_PREFIX}subscriptionOverrides`,
  /** Held while a command changes `subscriptionOverrides` (see `withStorageLock`). */
  subscriptionOverridesLock: `${STORAGE_PREFIX}subscriptionOverrides:lock`,
} as const;

/** The stored statement of one account or jar (see `StoredStatement`). */
export function getStatementKey(accountId: string) {
  return `${STORAGE_PREFIX}statement:${accountId}`;
}

// Monobank allows one client-info request per 60 seconds.
export const CLIENT_INFO_TTL = MOCK_API ? MOCK_CONFIG.clientInfoTtl : 1000 * 60;
/**
 * "Show Currency Rates", "Show Accounts" and "Currency Rate Menu Bar". monobank changes its rates only a few times
 * a day. The menu bar refreshes every 2 hours, so its background runs always refetch, while opening its menu
 * refetches only rates older than this.
 */
export const RATES_TTL = 1000 * 60 * 30;
/**
 * AI tools and "Convert Currency" fetch only when the user asks something, so they refetch sooner and use the
 * current rate. monobank caches its rates for 5 minutes anyway.
 */
export const FRESH_RATES_TTL = 1000 * 60 * 5;
/** How many days of rates `rateHistory` keeps, one snapshot per day. */
export const RATE_HISTORY_DAYS = 7;

// Statement limits from the monobank API docs.
/** The longest period one statement request can cover: 31 days and 1 hour, in seconds. */
export const STATEMENT_MAX_PERIOD = 2682000;
/**
 * Monobank allows one statement request per 60 seconds. Also how long a sync stays fresh: periods that run until
 * now aren't resynced sooner.
 */
export const STATEMENT_RATE_LIMIT = MOCK_API ? MOCK_CONFIG.statementRateLimit : 60_000;
/**
 * How long a statement load waits before it uses the rate limit. A load replaced within this time
 * (e.g. by quickly switching accounts) is cancelled without sending a request.
 */
export const STATEMENT_REQUEST_DELAY = 500;
/** The most items one statement request returns. */
export const STATEMENT_PAGE_SIZE = 500;
/**
 * How many calendar months of transactions the stored statement keeps (counted from the start of the same day) when
 * the "Keep Statements For" preference has an unknown value. The preference sets retention, and its default of
 * 3 months always keeps "Last Month". Older transactions are dropped the next time a command reads the statement.
 */
export const DEFAULT_STATEMENT_RETENTION_MONTHS = 3;
/** How many calendar months of history "Sync Statements" loads when "Keep Statements For" is Unlimited. */
export const HISTORY_SYNC_MONTHS_UNLIMITED = 12;
/**
 * How long a statement remembers the chosen account and period since they were last used (picked or opened).
 * After that, the default account opens (the first pinned one, or the first UAH card) with the default period.
 * The period is also remembered only for the account it was chosen on, so it resets when the account changes.
 */
export const STATEMENT_SELECTION_TTL = 5 * 60_000;

/** A budget shows a warning once this share of its limit is spent. */
export const BUDGET_WARNING_RATIO = 0.8;
/**
 * How old the statement of a budget account can be before budgets update it. Longer than the rate limit, so
 * opening budgets again soon after doesn't wait for one request per card.
 */
export const BUDGET_SYNC_MAX_AGE = 5 * 60_000;

/**
 * How much a subscription's charges can differ from each other, so one charged in another currency still matches
 * (its amount is compared in the operation currency). Larger changes start a new series, e.g. a price change.
 */
export const SUBSCRIPTION_AMOUNT_TOLERANCE = 0.1;
/**
 * The most a subscription's price can change, as a share of the lower price, to still count as the same one:
 * up to 3 times, e.g. 149 → 299 ₴ for a family plan.
 */
export const SUBSCRIPTION_MAX_PRICE_CHANGE = 2;
/**
 * How many irregular charges of the same merchant a subscription's span can have, per charge of its own. More,
 * and the merchant is a shop visited often whose charges happen to be about a month apart.
 */
export const SUBSCRIPTION_MAX_NOISE = 0.5;
/**
 * How many subscriptions of one merchant at the same price can be told apart by the day they're charged on, e.g.
 * iCloud and Telegram, both $2.99 through Apple, on the 12th and the 21st.
 */
export const SUBSCRIPTION_MAX_INTERLEAVED = 3;
/** The share of gaps between charges that must match the cadence. The rest can be twice as long (a missed charge). */
export const SUBSCRIPTION_MIN_GAP_SHARE = 0.75;
/** Gaps between charges, in days, for each cadence. */
export const SUBSCRIPTION_CADENCE_DAYS = {
  weekly: [6, 8],
  monthly: [27, 33],
  quarterly: [85, 96],
} as const satisfies Record<string, readonly [min: number, max: number]>;
/** How many days past its expected date a charge can come before the subscription shows as possibly cancelled. */
export const SUBSCRIPTION_GRACE_DAYS = { weekly: 2, monthly: 5, quarterly: 10 } as const;
/** Upcoming subscriptions are the ones expected within this many days. */
export const SUBSCRIPTION_UPCOMING_DAYS = 7;
/**
 * MCCs that are never subscriptions: transfers (4829, 6538, 6540), cash (6010, 6011) and buying currency or
 * crypto (6012), and taxes (9311), which recur at a fixed amount but aren't subscriptions.
 */
export const SUBSCRIPTION_EXCLUDED_MCC: ReadonlySet<number> = new Set([4829, 6010, 6011, 6012, 6538, 6540, 9311]);
/**
 * MCCs of typical subscriptions: telecom (4814), cable and streaming (4899), digital goods (5815–5818), direct
 * marketing subscriptions (5968) and software services (7372). Two charges are enough for these.
 */
export const SUBSCRIPTION_MCC: ReadonlySet<number> = new Set([4814, 4899, 5815, 5816, 5817, 5818, 5968, 7372]);

/** Receipts are looked up on check.gov.ua by their number. It has no documented deep link. */
export const CHECK_GOV_URL = "https://check.gov.ua/";

export const SEND_BASE_URL = "https://send.monobank.ua";

export const accountTypeColors: Record<AccountType, Color | string> = {
  black: "#777777",
  white: Color.PrimaryText,
  platinum: Color.Magenta,
  iron: Color.SecondaryText,
  fop: Color.Green,
  yellow: Color.Yellow,
  eAid: Color.Blue,
};

/** Short names of account types, e.g. "Black" for an unnamed card in "Show Statement" ("Black *0001"). */
export const accountTypeTitles: Record<AccountType, string> = {
  black: "Black",
  white: "White",
  platinum: "Platinum",
  iron: "Iron",
  fop: "FOP",
  yellow: "Yellow",
  eAid: "eAid",
};

/** The id of the USD – UAH rate (ISO 4217 numeric codes), the default rate in the menu bar. */
export const USD_UAH_RATE_ID = "840-980";

/**
 * Payment details of Universal Bank, which issues monobank accounts. The MFO is also read from the IBAN
 * (see `getIbanMfo`); this one is the fallback.
 */
export const BANK_REQUISITES = {
  nameUk: "АТ «Універсал Банк»",
  nameEn: "JSC Universal Bank",
  edrpou: "21133352",
  mfo: "322001",
  swift: "UNJSUAUKXXX",
} as const;
