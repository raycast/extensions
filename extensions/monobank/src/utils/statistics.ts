import { Icon } from "@raycast/api";
import {
  Account,
  AccountType,
  CountedTransaction,
  CurrencyRate,
  StatisticsFilters,
  StatisticsViewId,
  Transaction,
} from "../types";
import { getStatementItemTitle, isAccount } from "./accounts";
import { isDefaultBudgetAccount } from "./budgets";
import { ChartColor, ChartSlice, otherSliceColor, sliceColors } from "./chart";
import { Flow, FlowGroup, getFlowKey } from "./flows";
import { normalizeCategoryText } from "./mcc";
import { convertAmount } from "./rates";

interface StatisticsViewInfo {
  title: string;
  icon: Icon;
  /** What the view's rows are, e.g. "Categories", for the section title. */
  rowsTitle: string;
  /** One row, for action titles, e.g. "Hide Category". */
  rowName: string;
  /** What the view's total is, in the middle of the chart. */
  totalLabel: string;
  /** Shown when the view has nothing for the period. */
  empty: string;
}

export const statisticsViews: Record<StatisticsViewId, StatisticsViewInfo> = {
  expenses: {
    title: "Expenses",
    icon: Icon.ArrowUp,
    rowsTitle: "Categories",
    rowName: "Category",
    totalLabel: "Spent",
    empty: "No expenses",
  },
  income: {
    title: "Income",
    icon: Icon.ArrowDown,
    rowsTitle: "Categories",
    rowName: "Category",
    totalLabel: "Income",
    empty: "No income",
  },
  savings: {
    title: "Savings",
    icon: Icon.Coins,
    rowsTitle: "Jars",
    rowName: "Jar",
    totalLabel: "Saved",
    empty: "No top-ups of your jars",
  },
  ownTransfers: {
    title: "Own Transfers",
    icon: Icon.Switch,
    rowsTitle: "Cards",
    rowName: "Card",
    totalLabel: "To Own Cards",
    empty: "No transfers between your accounts",
  },
};

export const statisticsViewIds = Object.keys(statisticsViews) as StatisticsViewId[];

export function isStatisticsViewId(value: string): value is StatisticsViewId {
  return value in statisticsViews;
}

export const DEFAULT_STATISTICS_FILTERS: StatisticsFilters = { excluded: {} };

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/** The filters read from storage, without anything that isn't in their format. */
export function toStatisticsFilters(value: unknown): StatisticsFilters {
  if (typeof value !== "object" || value === null) return DEFAULT_STATISTICS_FILTERS;
  const { accountIds, excluded } = value as Partial<Record<keyof StatisticsFilters, unknown>>;

  const keys: StatisticsFilters["excluded"] = {};
  if (typeof excluded === "object" && excluded !== null) {
    for (const view of statisticsViewIds) {
      const list = (excluded as Record<string, unknown>)[view];
      if (isStringArray(list)) keys[view] = list;
    }
  }
  return { accountIds: isStringArray(accountIds) ? accountIds : undefined, excluded: keys };
}

/** The accounts statistics can count: cards first, then FOP accounts, as in the account dropdown. Jars never count. */
export function getStatisticsAccounts(accounts: Account[]) {
  const cards = accounts.filter((account) => account.type !== AccountType.FOP);
  const fops = accounts.filter((account) => account.type === AccountType.FOP);
  return [...cards, ...fops];
}

/** The ids of the switched-on accounts: the saved ones that still exist, or personal UAH cards until the user chooses. */
export function resolveStatisticsAccountIds(accounts: Account[], savedIds?: string[]): Set<string> {
  const enabled = savedIds
    ? accounts.filter((account) => savedIds.includes(account.id))
    : accounts.filter(isDefaultBudgetAccount);
  return new Set(enabled.map((account) => account.id));
}

/** A slice of a view: a category, a jar, or the card money went to. */
export interface StatisticsRow {
  key: string;
  title: string;
  /** Other texts the row is found by, e.g. the category's Ukrainian name. */
  keywords: string[];
  icon: Icon;
  /** Positive, in UAH, on the switched-on accounts. */
  amount: number;
  /** How many transactions of the switched-on accounts it has. */
  count: number;
  /** The transactions of the switched-on accounts that make up `amount`, newest first. */
  transactions: CountedTransaction[];
  /** Positive, in UAH, by account id, for every account with any: switched on or not. */
  byAccount: Record<string, number>;
}

/** Positive amounts in UAH. */
export interface StatisticsTotals {
  income: number;
  /** Without savings and transfers between the user's accounts. */
  expenses: number;
  /** Top-ups of the user's jars. */
  savings: number;
  /** Money taken back from the user's jars. */
  withdrawn: number;
  /** Outgoing transfers to the user's other cards and FOP accounts. */
  ownTransfers: number;
}

export interface Statistics {
  /** The rows with transactions on the switched-on accounts, largest first. Switched-off rows are included. */
  rows: Record<StatisticsViewId, StatisticsRow[]>;
  /** Of the switched-on accounts, without the switched-off rows. */
  totals: StatisticsTotals;
  /** The same for each account that could be converted, switched on or not, by account id. */
  byAccount: Record<string, StatisticsTotals>;
  /** Whether a switched-on account isn't in UAH, so the totals depend on today's rates. */
  isApproximate: boolean;
  /** Switched-on accounts left out, because there's no rate for their currency (yet). */
  unconverted: Account[];
}

type RowInfo = Pick<StatisticsRow, "key" | "title" | "keywords" | "icon">;

/** Newest first. */
function compareByTime(a: CountedTransaction, b: CountedTransaction) {
  return b.transaction.time - a.transaction.time;
}

function getCategoryRow({ category }: Transaction): RowInfo {
  return { key: category.name, title: category.name, keywords: [category.nameUk], icon: category.icon };
}

/**
 * Cash flow in UAH for "Show Statistics": what the switched-on accounts spent, received, saved and moved between
 * the user's own accounts, with the rows of each view. `groups` and `flows` are those of `classifyFlows`; jars
 * aren't counted themselves. Amounts in other currencies are converted the way monobank would exchange them today.
 * Transactions on hold count.
 *
 * `excluded` are the switched-off rows of each view: they stay in `rows`, but not in the totals.
 */
export function getStatistics(
  groups: FlowGroup[],
  flows: Map<string, Flow>,
  options: { enabledAccountIds: ReadonlySet<string>; excluded?: StatisticsFilters["excluded"]; rates: CurrencyRate[] },
): Statistics {
  const { enabledAccountIds, excluded = {}, rates } = options;
  const items = new Map(groups.map((group) => [group.account.id, group.account]));
  const rows: Record<StatisticsViewId, Map<string, StatisticsRow>> = {
    expenses: new Map(),
    income: new Map(),
    savings: new Map(),
    ownTransfers: new Map(),
  };
  const withdrawn: Record<string, number> = {};
  const converted: string[] = [];
  const unconverted: Account[] = [];
  let isApproximate = false;

  const getJarRow = (flow: Flow): RowInfo => {
    const jar = flow.counterpartId ? items.get(flow.counterpartId) : undefined;
    const title = jar?.title ?? flow.label ?? "Jar";
    return { key: jar?.id ?? `title:${normalizeCategoryText(title)}`, title, keywords: [], icon: Icon.Coins };
  };
  const getCardRow = (flow: Flow): RowInfo => {
    const card = flow.counterpartId ? items.get(flow.counterpartId) : undefined;
    const title = card ? getStatementItemTitle(card) : (flow.label ?? "Own Card");
    const keywords = card && isAccount(card) ? [card.currency.code, card.type] : [];
    return { key: card?.id ?? `label:${title}`, title, keywords, icon: Icon.CreditCard };
  };

  for (const { account, transactions } of groups) {
    if (!isAccount(account)) continue;

    const isEnabled = enabledAccountIds.has(account.id);
    const rate = convertAmount(rates, 1, account.currency.code, "UAH")?.result;
    if (rate === undefined) {
      if (isEnabled) unconverted.push(account);
      continue;
    }
    converted.push(account.id);
    if (isEnabled && account.currency.code !== "UAH") isApproximate = true;

    const add = (view: StatisticsViewId, info: RowInfo, transaction: Transaction, amount: number) => {
      const row = rows[view].get(info.key) ?? { ...info, amount: 0, count: 0, transactions: [], byAccount: {} };
      row.byAccount[account.id] = (row.byAccount[account.id] ?? 0) + amount;
      if (isEnabled) {
        row.amount += amount;
        row.count++;
        row.transactions.push({ account, transaction, amount });
      }
      rows[view].set(info.key, row);
    };

    for (const transaction of transactions) {
      const flow = flows.get(getFlowKey(account.id, transaction.id));
      if (!flow || transaction.amount === 0) continue;

      const amount = Math.abs(transaction.amount) * rate;
      if (flow.kind === "expense") add("expenses", getCategoryRow(transaction), transaction, amount);
      else if (flow.kind === "income") add("income", getCategoryRow(transaction), transaction, amount);
      else if (flow.kind === "savings") add("savings", getJarRow(flow), transaction, amount);
      else if (flow.kind === "withdrawal") withdrawn[account.id] = (withdrawn[account.id] ?? 0) + amount;
      // The incoming side isn't counted: the money is the same.
      else if (transaction.amount < 0) add("ownTransfers", getCardRow(flow), transaction, amount);
    }
  }

  // A view's amount: of the switched-on accounts, or of one account, without the switched-off rows.
  const sum = (view: StatisticsViewId, accountId?: string) => {
    const off = new Set(excluded[view]);
    let total = 0;
    for (const row of rows[view].values()) {
      if (!off.has(row.key)) total += accountId === undefined ? row.amount : (row.byAccount[accountId] ?? 0);
    }
    return total;
  };
  const getTotals = (accountId?: string): StatisticsTotals => ({
    income: sum("income", accountId),
    expenses: sum("expenses", accountId),
    savings: sum("savings", accountId),
    ownTransfers: sum("ownTransfers", accountId),
    withdrawn:
      accountId === undefined
        ? converted.reduce((total, id) => total + (enabledAccountIds.has(id) ? (withdrawn[id] ?? 0) : 0), 0)
        : (withdrawn[accountId] ?? 0),
  });
  const sort = (view: StatisticsViewId) => {
    const list = [...rows[view].values()].filter((row) => row.count > 0);
    // Each account's transactions are newest first; a row's are of several accounts.
    for (const row of list) row.transactions.sort(compareByTime);
    return list.sort((a, b) => b.amount - a.amount || a.title.localeCompare(b.title));
  };

  return {
    rows: {
      expenses: sort("expenses"),
      income: sort("income"),
      savings: sort("savings"),
      ownTransfers: sort("ownTransfers"),
    },
    totals: getTotals(),
    byAccount: Object.fromEntries(converted.map((id) => [id, getTotals(id)])),
    isApproximate,
    unconverted,
  };
}

/** The key of the chart slice that stands for the rows without a colour of their own. */
export const OTHER_SLICE_KEY = "slice:other";

/**
 * The colour of the row at `index` of a view's rows. Rows get colours by their place among all rows, switched on
 * or not, so switching one off never recolours the others. Past the last colour, rows share the grey of "Other".
 */
export function getRowColor(index: number): ChartColor {
  return sliceColors[index] ?? otherSliceColor;
}

/** The key of the chart slice the row at `index` is drawn as: its own, or "Other". */
export function getSliceKey(row: StatisticsRow, index: number) {
  return index < sliceColors.length ? row.key : OTHER_SLICE_KEY;
}

/** The switched-on rows as chart slices, largest first: one per row with a colour, then the rest as "Other". */
export function getSlices(rows: StatisticsRow[], excluded: readonly string[] = []): ChartSlice[] {
  const off = new Set(excluded);
  const slices: ChartSlice[] = [];
  let other = 0;

  rows.forEach((row, index) => {
    if (off.has(row.key)) return;
    if (index < sliceColors.length) slices.push({ key: row.key, amount: row.amount, color: sliceColors[index] });
    else other += row.amount;
  });

  if (other > 0) slices.push({ key: OTHER_SLICE_KEY, amount: other, color: otherSliceColor });
  return slices;
}

/** `amount` as a share of `total`, e.g. "34%", or "<1%" for a share that would round to nothing. */
export function formatShare(amount: number, total: number) {
  if (!(total > 0) || amount <= 0) return "0%";
  const share = (amount / total) * 100;
  return share < 0.5 ? "<1%" : `${Math.round(share)}%`;
}
