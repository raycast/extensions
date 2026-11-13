import { Color, Icon, List } from "@raycast/api";
import { CHECK_GOV_URL, STATEMENT_MAX_PERIOD } from "../data/constants";
import { Currency, Period, PeriodPreset, SavedPeriod, Transaction } from "../types";
import { formatAmount, formatPlainAmount } from "./currency";
import { isSavings } from "./savings";

export const periodPresetTitles: Record<PeriodPreset, string> = {
  today: "Today",
  last7Days: "Last 7 Days",
  thisMonth: "This Month",
  lastMonth: "Last Month",
  last31Days: "Last 31 Days",
};

export const DEFAULT_PERIOD: Period = { preset: "last31Days" };

export interface ResolvedPeriod {
  /** Unix seconds. */
  from: number;
  /** Unix seconds. Left out when the period ends now, so the API uses the current time. */
  to?: number;
  label: string;
  /** Identifies the period in the cache. Presets include their start, so "Today" changes daily. */
  key: string;
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

export function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Midnight `days` days before `date`'s day. Built from calendar fields, so DST changes don't shift it. */
function daysAgo(date: Date, days: number) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - days);
}

export function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);
}

export function isPreset(period: Period): period is { preset: PeriodPreset } {
  return "preset" in period;
}

/** Whether a value read from storage is a `SavedPeriod`. */
export function isSavedPeriod(value: unknown): value is SavedPeriod {
  if (typeof value !== "object" || value === null) return false;
  const { accountId, period } = value as Partial<Record<keyof SavedPeriod, unknown>>;
  if (typeof accountId !== "string" || typeof period !== "object" || period === null) return false;

  const { preset, from, to } = period as Record<string, unknown>;
  return (
    (typeof preset === "string" && preset in periodPresetTitles) || (typeof from === "number" && typeof to === "number")
  );
}

export function resolvePeriod(period: Period, now = new Date()): ResolvedPeriod {
  if (!isPreset(period)) {
    return {
      from: period.from,
      to: period.to,
      label: formatDateRange(period.from, period.to),
      key: `${period.from}-${period.to}`,
    };
  }

  const label = periodPresetTitles[period.preset];
  const withKey = (from: Date, to?: Date) => ({
    from: toUnix(from),
    to: to && toUnix(to),
    label,
    key: `${period.preset}:${toUnix(from)}`,
  });

  switch (period.preset) {
    case "today":
      return withKey(startOfDay(now));
    case "last7Days":
      return withKey(daysAgo(now, 6));
    case "thisMonth":
      return withKey(new Date(now.getFullYear(), now.getMonth(), 1));
    case "lastMonth": {
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return withKey(new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(thisMonth.getTime() - 1000));
    }
    case "last31Days":
      // Today plus the 30 days before it: under the 31 days and 1 hour monobank allows, even across a DST change.
      return withKey(daysAgo(now, 30));
  }
}

/** Returns an error message for a range monobank would reject, or `undefined` when it's valid. */
export function validatePeriod(from: number, to: number, now = new Date()) {
  if (from >= to) return "Start must be before the end";
  if (to > toUnix(now)) return "The period can't end in the future";
  if (to - from > STATEMENT_MAX_PERIOD) return "The period can't be longer than 31 days";
  return undefined;
}

/**
 * The last day a period starting on `from`'s day can end on: 30 days later, so the whole day still fits in the
 * 31 days monobank returns at once. Midnight of that day, in unix seconds.
 */
export function getLatestPeriodEnd(from: number) {
  const date = new Date(from * 1000);
  return toUnix(new Date(date.getFullYear(), date.getMonth(), date.getDate() + 30));
}

/** E.g. "1 Jul", "Mon 1 Jul 2026" with both options. */
export function formatDate(date: Date, options: { year?: boolean; weekday?: boolean } = {}) {
  return date.toLocaleDateString("en-GB", {
    weekday: options.weekday ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: options.year ? "numeric" : undefined,
  });
}

/** E.g. "3 Oct – 15 Oct 2026", or "28 Dec 2025 – 5 Jan 2026" across years. */
export function formatDateRange(from: number, to: number) {
  const start = new Date(from * 1000);
  const end = new Date(to * 1000);

  if (startOfDay(start).getTime() === startOfDay(end).getTime()) return formatDate(end, { year: true });

  const isSameYear = start.getFullYear() === end.getFullYear();
  return `${formatDate(start, { year: !isSameYear })} – ${formatDate(end, { year: true })}`;
}

/** E.g. "14:32". */
export function formatTime(time: number) {
  return new Date(time * 1000).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** E.g. "Mon 9 Nov 2026, 14:32". */
export function formatDateTime(time: number) {
  return `${formatDate(new Date(time * 1000), { weekday: true, year: true })}, ${formatTime(time)}`;
}

export interface DaySection {
  /** The local date. */
  key: string;
  title: string;
  transactions: Transaction[];
  /** Income minus expenses of the day, in the account currency. */
  net: number;
}

/** Splits transactions (newest first) into days, keeping their order. */
export function groupByDay(transactions: Transaction[], now = new Date()): DaySection[] {
  const today = startOfDay(now).getTime();
  const yesterday = daysAgo(now, 1).getTime();
  const sections: DaySection[] = [];

  for (const transaction of transactions) {
    const day = startOfDay(new Date(transaction.time * 1000));
    const key = `${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`;
    let section = sections[sections.length - 1];

    if (section?.key !== key) {
      const title =
        day.getTime() === today
          ? "Today"
          : day.getTime() === yesterday
            ? "Yesterday"
            : formatDate(day, { weekday: true, year: day.getFullYear() !== now.getFullYear() });
      section = { key, title, transactions: [], net: 0 };
      sections.push(section);
    }

    section.transactions.push(transaction);
    section.net += transaction.amount;
  }

  return sections;
}

export interface CategorySpending {
  /** The English category name, which groups every MCC that shares it (e.g. all hotel chains). */
  name: string;
  nameUk: string;
  icon: Icon;
  /** Positive. */
  amount: number;
  count: number;
}

export interface StatementSummary {
  /** `undefined` when there are no transactions and no fallback currency was given. */
  currency?: Currency;
  income: number;
  /** Positive. Doesn't include savings. */
  expenses: number;
  /** Positive. Transfers to the user's own jars, which aren't spending. */
  savings: number;
  cashback: number;
  count: number;
  /** Transactions on hold (not settled yet), which are included in the totals. */
  holdCount: number;
  /** Expenses by category name, largest first. Savings aren't included. */
  categories: CategorySpending[];
  /** The part of `expenses` that is charges of subscriptions. Positive. */
  subscriptions: { amount: number; count: number };
}

/**
 * `currency` is used when there are no transactions, e.g. when a search matches none. `isSubscriptionCharge` tells
 * which expenses count as subscriptions.
 */
export function summarize(
  transactions: Transaction[],
  currency?: Currency,
  isSubscriptionCharge?: (transaction: Transaction) => boolean,
): StatementSummary {
  const categories = new Map<string, CategorySpending>();
  const subscriptions = { amount: 0, count: 0 };
  let income = 0;
  let expenses = 0;
  let savings = 0;
  let cashback = 0;
  let holdCount = 0;

  for (const transaction of transactions) {
    cashback += transaction.cashback;
    if (transaction.hold) holdCount++;

    if (transaction.amount >= 0) {
      income += transaction.amount;
      continue;
    }

    if (isSavings(transaction)) {
      savings -= transaction.amount;
      continue;
    }

    expenses -= transaction.amount;
    if (isSubscriptionCharge?.(transaction)) {
      subscriptions.amount -= transaction.amount;
      subscriptions.count++;
    }

    const { name, nameUk, icon } = transaction.category;
    const category = categories.get(name) ?? { name, nameUk, icon, amount: 0, count: 0 };
    category.amount -= transaction.amount;
    category.count++;
    categories.set(name, category);
  }

  return {
    currency: transactions[0]?.currency ?? currency,
    income,
    expenses,
    savings,
    cashback,
    count: transactions.length,
    holdCount,
    categories: [...categories.values()].sort((a, b) => b.amount - a.amount),
    subscriptions,
  };
}

/** Fields a transaction is found by: description, comment, counterparty, category in both languages, MCC and amount. */
export function getSearchTexts(t: Transaction) {
  const texts = [
    t.description,
    t.comment,
    t.counterName,
    t.category.name,
    t.category.nameUk,
    t.category.groupName,
    t.category.groupNameUk,
    String(t.mcc),
    formatPlainAmount(Math.abs(t.amount), t.currency),
    String(Math.trunc(Math.abs(t.amount))),
  ];
  return texts.filter((text): text is string => !!text);
}

/** Lowercase, with the different apostrophes made one, so "McDonald's" finds "McDonald’s". */
function normalizeSearchText(text: string) {
  return text.toLowerCase().replace(/[’ʼ‘`]/g, "'");
}

/**
 * Transactions that contain every word of `query` in their search texts. An empty query returns `transactions`.
 * `getExtraTexts` adds texts that aren't part of the transaction, e.g. the "Subscription" tag.
 */
export function filterTransactions(
  transactions: Transaction[],
  query: string,
  getExtraTexts?: (transaction: Transaction) => string[],
) {
  const terms = normalizeSearchText(query.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return transactions;

  return transactions.filter((transaction) => {
    const texts = [...getSearchTexts(transaction), ...(getExtraTexts?.(transaction) ?? [])];
    const text = normalizeSearchText(texts.join("\n"));
    return terms.every((term) => text.includes(term));
  });
}

const csvColumns: [title: string, value: (transaction: Transaction) => string | number | undefined, isText?: true][] = [
  ["Time", (t) => formatCsvTime(t.time)],
  ["Description", (t) => t.description, true],
  ["Category", (t) => t.category.name, true],
  ["MCC", (t) => t.mcc],
  ["Amount", (t) => formatPlainAmount(t.amount, t.currency)],
  ["Currency", (t) => t.currency.code],
  ["Operation Amount", (t) => formatPlainAmount(t.operationAmount, t.operationCurrency)],
  ["Operation Currency", (t) => t.operationCurrency.code],
  ["Commission", (t) => formatPlainAmount(t.commission, t.currency)],
  ["Cashback", (t) => formatPlainAmount(t.cashback, t.currency)],
  ["Balance", (t) => formatPlainAmount(t.balance, t.currency)],
  ["On Hold", (t) => (t.hold ? "yes" : "no")],
  ["Comment", (t) => t.comment, true],
  ["Counterparty", (t) => t.counterName, true],
  ["Counterparty IBAN", (t) => t.counterIban, true],
  ["Counterparty EDRPOU", (t) => t.counterEdrpou, true],
  ["Receipt ID", (t) => t.receiptId, true],
  ["Invoice ID", (t) => t.invoiceId, true],
  ["ID", (t) => t.id, true],
];

/** Local time that spreadsheets recognize, e.g. "2026-11-09 14:32:05". */
function formatCsvTime(time: number) {
  const date = new Date(time * 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

function toCsvCell(value: string | number | undefined, isText = false) {
  let text = value === undefined ? "" : String(value);

  // Text such as a transfer comment is written by other people. Keep spreadsheets from running it as a formula.
  if (isText && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;

  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with a header row. */
export function toCsv(transactions: Transaction[]) {
  const header = csvColumns.map(([title]) => title).join(",");
  const rows = transactions.map((transaction) =>
    csvColumns.map(([, value, isText]) => toCsvCell(value(transaction), isText)).join(","),
  );
  return [header, ...rows].join("\r\n") + "\r\n";
}

/** E.g. "monobank Black UAH 2026-10-10 – 2026-11-09.csv". Characters that aren't allowed in file names are removed. */
export function getCsvFileName(accountTitle: string, transactions: Transaction[]) {
  const days = transactions.map((transaction) => formatCsvTime(transaction.time).slice(0, 10));
  const range = days.length ? ` ${days[days.length - 1]} – ${days[0]}` : "";
  return `monobank ${accountTitle}${range}.csv`.replace(/[/\\:*?"<>|]/g, "");
}

/** Green for incoming amounts, red for outgoing ones. */
export function getAmountColor(amount: number) {
  if (amount > 0) return Color.Green;
  if (amount < 0) return Color.Red;
  return undefined;
}

export const HOLD_TOOLTIP = "Not settled by the merchant's bank yet. The amount may still change.";

/** `subscriptionTag`: from `getSubscriptionTag`, when the transaction is a charge of a subscription. */
export function getTransactionAccessories(
  transaction: Transaction,
  subscriptionTag?: List.Item.Accessory,
): List.Item.Accessory[] {
  return [
    ...(subscriptionTag ? [subscriptionTag] : []),
    ...(transaction.hold ? [{ tag: { value: "Hold", color: Color.SecondaryText }, tooltip: HOLD_TOOLTIP }] : []),
    {
      text: {
        value: formatAmount(transaction.amount, transaction.currency, { signed: true }),
        color: getAmountColor(transaction.amount),
      },
    },
    { text: formatTime(transaction.time), tooltip: formatDateTime(transaction.time) },
  ];
}

/** check.gov.ua has no documented link to a receipt, so this is the search page; the number is copied separately. */
export function getCheckGovUrl() {
  return CHECK_GOV_URL;
}
