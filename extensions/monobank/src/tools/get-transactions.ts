import { toTransaction } from "../api/mappers";
import { loadClientInfo, resolveToolAccount } from "../services/clientInfo";
import { getDisplayNames, parseDateTime, roundAmount, toLocalIso } from "../services/format";
import { LoadedStatement, PeriodTooLongError, loadStatement } from "../services/statement";
import { PeriodPreset, Transaction } from "../types";
import { findSimilarCategories, normalizeCategoryText, resolveCategoryNames } from "../utils/mcc";
import { getJarTitles, SAVINGS_CATEGORY } from "../utils/savings";
import { resolvePeriod, summarize } from "../utils/statement";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

type Input = {
  /**
   * The `id` of an account or jar from `get-accounts`. Call `get-accounts` first when the user names an
   * account or jar. Leave out when none is named: the user's default account is used, and the result says which.
   */
  accountId?: string;
  /**
   * A period relative to today, computed in the user's time zone. Prefer it over `from`/`to` whenever it fits:
   * "today" (сьогодні); "last7Days" (last week, this week, за тиждень, за останній тиждень: today and the 6 days
   * before); "thisMonth" (цього місяця: from the 1st until now); "lastMonth" (минулого місяця: the whole previous
   * month); "last31Days" (last month as "the last 30 days", за останній місяць). When set, `from` and `to` are
   * ignored. When neither `period` nor `from` is set, the last 31 days are used.
   */
  period?: PeriodPreset;
  /**
   * Start of a custom period, as an ISO 8601 local date ("2026-11-01", the start of that day) or date-time
   * ("2026-11-01T18:00"). Only for periods `period` can't express. Any past date works. A period of any length works
   * back to the stored history's start; an older one can be at most 31 days, including the start day (see
   * `periodTooLong`). Pass the dates the user asked for, even for a long period.
   */
  from?: string;
  /**
   * End of a custom period, as an ISO 8601 local date (the end of that day) or date-time. Leave out for "until now".
   */
  to?: string;
  /**
   * "expense" for outgoing money, "income" for deposits, top-ups and incoming transfers (поповнення, надходження),
   * or "all" (the default). "expense" also returns transfers to the user's own jars (category "Savings"); for
   * spending totals use `totals.expenses`, which leaves them out.
   */
  type?: "expense" | "income" | "all";
  /**
   * Only transactions in these categories: names from `byCategory` of an earlier result, in English or Ukrainian,
   * e.g. ["Money transfer"] or ["Кафе. Ресторани", "Fast Food"]. Matches every MCC with that name. Combined with
   * `mccCodes` (a transaction matching either is included). With `type: "income"`, `categories: ["Money transfer"]`
   * answers "how much did I receive in transfers". `categories: ["Savings"]` (Заощадження) lists transfers to the
   * user's own jars, answering "how much did I save".
   */
  categories?: string[];
  /**
   * Only transactions with these Merchant Category Codes (ISO 18245), e.g. [5812, 5813, 5814] for cafes and
   * restaurants. When unsure which codes fit, leave out and use `byCategory` of the result.
   */
  mccCodes?: number[];
  /** Only transactions whose description, counterparty or comment contains this text (case-insensitive). */
  search?: string;
  /** How many transactions to list, newest first. Defaults to 50, at most 200. Totals always cover all matches. */
  limit?: number;
};

/**
 * Get the transactions (statement) of a monobank account or jar for a period, with totals
 * computed for the matching transactions: income, expenses, savings, net, cashback, and spending and income by merchant
 * category (`byCategory`, grouped by category name, with the MCC codes of each). Use the totals to answer "how much did I spend/receive" questions instead of
 * adding up the listed transactions, which may be cut to `limit`.
 *
 * Transfers to the user's own jars are categorized "Savings" (Заощадження) and counted in `totals.savings`, not in
 * `totals.expenses`: they're saved, not spent. `net` is income − expenses − savings, how much the balance changed.
 *
 * Amounts are in the account currency; expenses are negative in `transactions` and positive in the totals.
 * `holdCount` counts transactions the merchant's bank hasn't settled yet, whose amounts may still change.
 * Any past period works (e.g. a month from last year). Transactions are stored as far back as the "Keep Statements
 * For" preference, and a stored period can be any length (e.g. the last 3 months). monobank returns at most 31 days at
 * once, so a longer period that reaches before the stored history returns `periodTooLong` instead of transactions,
 * with a `suggested` period to offer the user. Never split a period into several calls.
 * `incomplete: true` means the period has more transactions than monobank returns in one request, and only
 * transactions since `loadedSince` are counted. When `account.usedBecauseNoneWasNamed` is true, tell the user which account
 * was used.
 *
 * monobank allows one statement request per minute, so this can take up to a minute. Transactions are stored, so
 * calling it again for a past period that was already loaded is instant, and for a period that runs until today it's
 * instant within a minute of the last request (e.g. with other filters).
 */
export default async function tool(input: Input) {
  const loaded = await loadClientInfo();
  const { items, defaultItem } = loaded;
  const names = getDisplayNames(items);
  const account = resolveToolAccount(loaded, input.accountId);

  const categories = resolveCategories(input.categories);
  const now = Math.floor(Date.now() / 1000);
  const { from, to } = getPeriod(input, now);
  const accountInfo = {
    id: account.id,
    name: names.get(account.id),
    currency: account.currency.code,
    isDefault: account.id === defaultItem?.id,
    usedBecauseNoneWasNamed: !input.accountId,
  };

  let statement: LoadedStatement;
  try {
    statement = await loadStatement(account.id, { from, to });
  } catch (error) {
    if (!(error instanceof PeriodTooLongError)) throw error;
    return { account: accountInfo, periodTooLong: describeTooLong(error, from, to ?? now) };
  }

  const jarTitles = getJarTitles(loaded.clientInfo);
  const matches = statement.items
    .map((item) => toTransaction(item, account.currency, jarTitles))
    .filter((transaction) => matchesInput(transaction, input, categories));

  const summary = summarize(matches);
  const round = (amount: number) => roundAmount(amount, account.currency);
  const limit = Math.min(Math.max(Math.floor(input.limit ?? DEFAULT_LIMIT), 1), MAX_LIMIT);

  return {
    account: accountInfo,
    period: { from: toLocalIso(from), to: toLocalIso(to ?? now) },
    totals: {
      income: round(summary.income),
      expenses: round(summary.expenses),
      savings: round(summary.savings),
      net: round(summary.income - summary.expenses - summary.savings),
      cashback: round(summary.cashback),
      count: summary.count,
      holdCount: summary.holdCount,
    },
    byCategory: getCategoryTotals(matches).map((category) => ({
      ...category,
      expenses: round(category.expenses),
      income: round(category.income),
    })),
    transactions: matches.slice(0, limit).map(toCompactTransaction),
    truncated: matches.length > limit,
    incomplete: statement.incomplete,
    loadedSince: statement.loadedSince !== undefined ? toLocalIso(statement.loadedSince) : undefined,
  };
}

/** What the AI needs to offer a period monobank can return at once. */
function describeTooLong(error: PeriodTooLongError, from: number, to: number) {
  const toDate = (time: number) => toLocalIso(time).slice(0, 10);

  return {
    requested: { from: toLocalIso(from), to: toLocalIso(to) },
    maxDays: 31,
    suggested: { from: toDate(from), to: toDate(error.suggestedTo) },
    storedSince: error.storedSince !== undefined ? toDate(error.storedSince) : undefined,
    note:
      "Transactions before `storedSince` (or all of them without it) load from monobank, at most 31 days at once. " +
      "Don't give totals. Ask the user whether to use `suggested` (or another end date on or before it), and call " +
      "again only after they answer. Don't split the period into several calls.",
  };
}

/** Resolves the period to unix seconds. `to` is left out when the period ends now. */
function getPeriod(input: Input, now: number): { from: number; to?: number } {
  if (input.period || !input.from) {
    const { from, to } = resolvePeriod({ preset: input.period ?? "last31Days" });
    return { from, to };
  }

  const from = parseDateTime(input.from);
  const requestedTo = input.to ? parseDateTime(input.to, { endOfDay: true }) : undefined;
  // monobank rejects an end in the future, so a period that runs until today ends now.
  const to = requestedTo !== undefined && requestedTo < now ? requestedTo : undefined;

  if (from >= (to ?? now)) {
    throw new Error(`\`from\` must be before \`to\` and not in the future. Today is ${toLocalIso(now).slice(0, 10)}.`);
  }

  return { from, to };
}

/** English names for the `categories` input. Throws for a name that matches none, with similar ones to retry with. */
function resolveCategories(texts: string[] | undefined) {
  const names = new Set<string>();

  for (const text of texts ?? []) {
    const query = normalizeCategoryText(text);
    if (
      query === normalizeCategoryText(SAVINGS_CATEGORY.name) ||
      query === normalizeCategoryText(SAVINGS_CATEGORY.nameUk)
    ) {
      names.add(SAVINGS_CATEGORY.name);
      continue;
    }

    const resolved = resolveCategoryNames(text);
    if (!resolved.length) {
      const similar = findSimilarCategories(text);
      throw new Error(
        `No category is named "${text}".` +
          (similar.length
            ? ` Similar categories: ${similar.join(", ")}.`
            : " Call without `categories` and use the names in `byCategory`."),
      );
    }
    resolved.forEach((name) => names.add(name));
  }

  return names;
}

function matchesInput(transaction: Transaction, input: Input, categories: Set<string>) {
  if (input.type === "expense" && transaction.amount >= 0) return false;
  if (input.type === "income" && transaction.amount <= 0) return false;

  const codes = input.mccCodes ?? [];
  if (
    (codes.length || categories.size) &&
    !codes.includes(transaction.mcc) &&
    !categories.has(transaction.category.name)
  ) {
    return false;
  }

  const search = input.search?.trim().toLowerCase();
  if (search) {
    const texts = [transaction.description, transaction.counterName, transaction.comment];
    if (!texts.some((text) => text?.toLowerCase().includes(search))) return false;
  }

  return true;
}

/** Totals per category name, largest spending first. A name can cover several MCCs, e.g. every hotel chain. */
function getCategoryTotals(transactions: Transaction[]) {
  const categories = new Map<
    string,
    { name: string; nameUk: string; group: string; mccCodes: number[]; expenses: number; income: number; count: number }
  >();

  for (const transaction of transactions) {
    const { mcc, category } = transaction;
    const entry = categories.get(category.name) ?? {
      name: category.name,
      nameUk: category.nameUk,
      group: category.groupName,
      mccCodes: [],
      expenses: 0,
      income: 0,
      count: 0,
    };

    if (!entry.mccCodes.includes(mcc)) entry.mccCodes.push(mcc);
    if (transaction.amount < 0) entry.expenses -= transaction.amount;
    else entry.income += transaction.amount;
    entry.count++;
    categories.set(category.name, entry);
  }

  return [...categories.values()]
    .map((entry) => ({ ...entry, mccCodes: entry.mccCodes.sort((a, b) => a - b) }))
    .sort((a, b) => b.expenses - a.expenses || b.income - a.income);
}

function toCompactTransaction(transaction: Transaction) {
  const isOtherCurrency = transaction.operationCurrency.code !== transaction.currency.code;

  return {
    time: toLocalIso(transaction.time),
    description: transaction.description,
    amount: transaction.amount,
    operationAmount: isOtherCurrency ? transaction.operationAmount : undefined,
    operationCurrency: isOtherCurrency ? transaction.operationCurrency.code : undefined,
    category: transaction.category.name,
    categoryUk: transaction.category.nameUk,
    mcc: transaction.mcc,
    comment: transaction.comment,
    counterparty: transaction.counterName,
    hold: transaction.hold || undefined,
  };
}
