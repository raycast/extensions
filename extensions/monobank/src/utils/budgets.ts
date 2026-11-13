import { Color, Image } from "@raycast/api";
import { BUDGET_WARNING_RATIO } from "../data/constants";
import { Account, AccountOrJar, AccountType, Budget, CountedTransaction, Period, Transaction } from "../types";
import { getProgressRing, getStatementItemTitle, isAccount, progressColors } from "./accounts";
import { formatCurrency } from "./currency";
import { isPreset } from "./statement";

export type BudgetStatus = "ok" | "warning" | "over";

/** The calendar month budgets are counted for. */
export interface BudgetMonth {
  /** Unix seconds, the 1st at midnight. */
  from: number;
  /** Unix seconds, the last second of the month. */
  to: number;
  /** Whether it's the current month, which has a pace (`perDayLeft`, `projected`). */
  isCurrent: boolean;
  /** E.g. "November", or "December 2025" in another year. */
  label: string;
}

export interface BudgetProgress {
  budget: Budget;
  /** Expenses minus refunds of the transactions the budget counts (see `countsToward`), never below 0. */
  spent: number;
  /** `limit - spent`, negative when over. */
  left: number;
  /** `spent / limit`. */
  ratio: number;
  status: BudgetStatus;
  /** Net spending per category, in the budget's order, without the excluded transactions. */
  categories: { name: string; spent: number }[];
  /** Net spending per account, in the order of the groups passed; accounts with none are left out. */
  byAccount: { accountId: string; spent: number }[];
  /** Net spending of the transactions added by hand, already in `spent`. */
  added: { spent: number; count: number };
  /** What the excluded transactions would have added to `spent`. */
  excluded: { amount: number; count: number };
  /** Current month only: what's left per day, today included. */
  perDayLeft?: number;
  /** Current month only: the spending by the end of the month at the pace so far. */
  projected?: number;
  /** Current month only: days left, today included. */
  daysLeft?: number;
}

function toUnix(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

/** The month for "This Month" and "Last Month", or `undefined` for other periods, which budgets don't show for. */
export function getBudgetMonth(period: Period, now = new Date()): BudgetMonth | undefined {
  if (!isPreset(period) || (period.preset !== "thisMonth" && period.preset !== "lastMonth")) return undefined;

  const offset = period.preset === "thisMonth" ? 0 : -1;
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  const label = start.toLocaleDateString("en-GB", {
    month: "long",
    year: start.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });

  return { from: toUnix(start), to: toUnix(end) - 1, isCurrent: offset === 0, label };
}

export function getBudgetStatus(ratio: number): BudgetStatus {
  if (ratio > 1) return "over";
  if (ratio >= BUDGET_WARNING_RATIO) return "warning";
  return "ok";
}

/** The transactions of one budget account. */
export interface BudgetTransactionGroup {
  accountId: string;
  transactions: Transaction[];
}

export type BudgetMatch = "category" | "added" | "excluded";

/**
 * How `budget` treats `transaction`: counted by its category, counted because it was added by hand, excluded by
 * hand from its categories, or not at all. Categories are checked every time, so corrections stay right after the
 * categories change: an added transaction whose category joins the budget counts once, by category.
 */
export function getBudgetMatch(budget: Budget, transaction: Transaction): BudgetMatch | undefined {
  if (budget.categories.includes(transaction.category.name)) {
    return budget.excluded?.includes(transaction.id) ? "excluded" : "category";
  }
  return budget.added?.includes(transaction.id) ? "added" : undefined;
}

/** Whether `budget` counts `transaction`, by category or added by hand. */
export function countsToward(budget: Budget, transaction: Transaction) {
  const match = getBudgetMatch(budget, transaction);
  return match === "category" || match === "added";
}

/** The budgets that count `transaction`, in `budgets` order, with why, and the ones it's excluded from. */
export function getTransactionBudgets(budgets: Budget[], transaction: Transaction) {
  const counted: { budget: Budget; reason: "category" | "added" }[] = [];
  const excluded: Budget[] = [];
  for (const budget of budgets) {
    const match = getBudgetMatch(budget, transaction);
    if (match === "excluded") excluded.push(budget);
    else if (match) counted.push({ budget, reason: match });
  }
  return { counted, excluded };
}

function isInMonth(transaction: Transaction, month: BudgetMonth) {
  return transaction.time >= month.from && transaction.time <= month.to;
}

/**
 * How much of each budget is spent in `month`, across every group. Pass all loaded transactions of the month, not
 * the ones a search matched. Holds count; positive transactions a budget counts (refunds) reduce its spending.
 */
export function getBudgetProgress(
  budgets: Budget[],
  groups: BudgetTransactionGroup[],
  month: BudgetMonth,
  now = new Date(),
): BudgetProgress[] {
  const monthGroups = groups.map(({ accountId, transactions }) => ({
    accountId,
    transactions: transactions.filter((transaction) => isInMonth(transaction, month)),
  }));

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysElapsed = now.getDate();
  const daysLeft = daysInMonth - daysElapsed + 1;

  return budgets.map((budget) => {
    const byCategory = new Map(budget.categories.map((name) => [name, 0]));
    const added = { spent: 0, count: 0 };
    const excluded = { amount: 0, count: 0 };
    const byAccount = monthGroups
      .map(({ accountId, transactions }) => {
        let spent = 0;
        for (const transaction of transactions) {
          const match = getBudgetMatch(budget, transaction);
          if (!match) continue;
          if (match === "excluded") {
            excluded.amount -= transaction.amount;
            excluded.count++;
            continue;
          }

          spent -= transaction.amount;
          if (match === "added") {
            added.spent -= transaction.amount;
            added.count++;
          } else {
            const { name } = transaction.category;
            byCategory.set(name, (byCategory.get(name) ?? 0) - transaction.amount);
          }
        }
        return { accountId, spent };
      })
      .filter((account) => account.spent !== 0);

    const categories = [...byCategory].map(([name, spent]) => ({ name, spent }));
    const spent = Math.max(
      byAccount.reduce((sum, account) => sum + account.spent, 0),
      0,
    );
    const left = budget.limit - spent;
    const ratio = budget.limit > 0 ? spent / budget.limit : 0;

    return {
      budget,
      spent,
      left,
      ratio,
      status: getBudgetStatus(ratio),
      categories,
      byAccount,
      added,
      excluded,
      ...(month.isCurrent && {
        perDayLeft: Math.max(left, 0) / daysLeft,
        projected: (spent / daysElapsed) * daysInMonth,
        daysLeft,
      }),
    };
  });
}

/** A transaction `budget` counts, by its category or because it was added by hand. */
export type BudgetCountedTransaction = CountedTransaction & { match: "category" | "added" };

/**
 * The transactions of `month` behind a budget's spending in `getBudgetProgress`, newest first: the ones it counts,
 * whose amounts add up to it (before it's kept from going below 0), and the ones excluded by hand, with what each
 * would have added.
 */
export function getBudgetTransactions(
  budget: Budget,
  groups: { account: Account; transactions: Transaction[] }[],
  month: BudgetMonth,
) {
  const counted: BudgetCountedTransaction[] = [];
  const excluded: CountedTransaction[] = [];

  for (const { account, transactions } of groups) {
    for (const transaction of transactions) {
      if (!isInMonth(transaction, month)) continue;
      const match = getBudgetMatch(budget, transaction);
      if (!match) continue;

      const entry = { account, transaction, amount: -transaction.amount };
      if (match === "excluded") excluded.push(entry);
      else counted.push({ ...entry, match });
    }
  }

  // Each account's transactions are newest first; these are of several accounts.
  const byTime = (a: CountedTransaction, b: CountedTransaction) => b.transaction.time - a.transaction.time;
  return { counted: counted.sort(byTime), excluded: excluded.sort(byTime) };
}

/** Whether budgets can count `item`: a card or FOP account in UAH. Jars and USD/EUR cards never count. */
export function isBudgetEligible(item: AccountOrJar): item is Account {
  return isAccount(item) && item.currency.code === "UAH";
}

// Money on these can only be spent on what the state programme allows, so it isn't part of everyday spending.
const stateProgrammeTypes: AccountType[] = [AccountType.EAID, AccountType.MADE_IN_UKRAINE];

/**
 * Whether budgets count `account` until the user chooses: personal UAH cards, not FOP accounts or the cards of
 * state programmes (eAid and National Cashback). A Diia card is spent like a regular one, so it counts.
 */
export function isDefaultBudgetAccount(account: AccountOrJar) {
  return isBudgetEligible(account) && account.type !== AccountType.FOP && !stateProgrammeTypes.includes(account.type);
}

/**
 * The accounts budgets count, in `items` order: the default ones without `savedIds`, else the eligible ones saved.
 * Saved ids of accounts that no longer exist are ignored.
 */
export function resolveBudgetAccounts(items: AccountOrJar[], savedIds?: string[]): Account[] {
  if (!savedIds) return items.filter(isDefaultBudgetAccount) as Account[];
  const ids = new Set(savedIds);
  return items.filter((item): item is Account => isBudgetEligible(item) && ids.has(item.id));
}

const statusColors = {
  ok: progressColors.green,
  warning: progressColors.orange,
  over: progressColors.red,
} satisfies Record<BudgetStatus, unknown>;

/** A ring colored by status: green, orange at the warning, red when over. */
export function getBudgetIcon(progress: BudgetProgress): Image.ImageLike {
  return getProgressRing(progress.ratio, statusColors[progress.status]);
}

/** The text color for a status: none when it's fine. */
export function getBudgetColor(status: BudgetStatus) {
  if (status === "over") return Color.Red;
  if (status === "warning") return Color.Orange;
  return undefined;
}

/** Whole hryvnias, e.g. "5 000 ₴". Budgets show rounded amounts. */
export function formatHryvnias(amount: number) {
  return formatCurrency(Math.round(amount), "UAH", 0);
}

/** The used share as a whole percentage, e.g. "65%". */
export function formatBudgetPercentage(progress: BudgetProgress) {
  return `${Math.round(progress.ratio * 100)}%`;
}

/** E.g. "3 240 / 5 000 ₴". */
export function formatSpentOfLimit(progress: BudgetProgress) {
  return `${Math.round(progress.spent).toLocaleString("uk-UA")} / ${formatHryvnias(progress.budget.limit)}`;
}

/** An amount to paste elsewhere, e.g. "1234.50": no symbol or spaces. */
export function formatPlainHryvnias(amount: number) {
  return amount.toFixed(2);
}

/**
 * A budget in one line, to share, e.g. "Cafes, November: 3 766 / 5 000 ₴ (75%), 1 234 ₴ left, ≈ 62 ₴ a day for
 * 20 days". Before its spending is loaded, only the limit and categories: "Cafes: 5 000 ₴ a month for Bars, Fast Food".
 */
export function formatBudgetSummary(budget: Budget, progress?: BudgetProgress, month?: BudgetMonth) {
  if (!progress) {
    return `${budget.name}: ${formatHryvnias(budget.limit)} a month for ${budget.categories.join(", ")}`;
  }

  const { left, perDayLeft, daysLeft } = progress;
  const parts = [
    `${formatSpentOfLimit(progress)} (${formatBudgetPercentage(progress)})`,
    left < 0 ? `over by ${formatHryvnias(-left)}` : `${formatHryvnias(left)} left`,
  ];
  if (left > 0 && perDayLeft !== undefined && daysLeft !== undefined) {
    parts.push(`≈ ${formatHryvnias(perDayLeft)} a day for ${daysLeft} ${daysLeft === 1 ? "day" : "days"}`);
  }
  return `${month ? `${budget.name}, ${month.label}` : budget.name}: ${parts.join(", ")}`;
}

/** E.g. "2 budgets over limit", "1 budget near limit", or `undefined` when all are fine. */
export function getBudgetAlert(progress: BudgetProgress[]): { status: BudgetStatus; text: string } | undefined {
  const over = progress.filter((item) => item.status === "over").length;
  if (over) return { status: "over", text: `${over} ${over === 1 ? "budget" : "budgets"} over limit` };

  const warning = progress.filter((item) => item.status === "warning").length;
  if (warning) return { status: "warning", text: `${warning} ${warning === 1 ? "budget" : "budgets"} near limit` };

  return undefined;
}

/**
 * A limit typed in a form, e.g. "5000", "5 000" or "5 000,50", in UAH. `undefined` when it isn't a number above 0.
 */
export function parseBudgetLimit(text: string): number | undefined {
  const cleaned = text
    .replace(/\s/g, "")
    .replace(/(₴|грн\.?|uah)$/i, "")
    .replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return undefined;

  const value = Math.round(Number(cleaned) * 100) / 100;
  return value > 0 ? value : undefined;
}

/** E.g. "3 cards", or the card's title when there's one, e.g. "Black *0001". */
export function formatBudgetAccounts(accounts: AccountOrJar[]) {
  return accounts.length === 1 ? getStatementItemTitle(accounts[0]) : `${accounts.length} cards`;
}

/** Whether `syncedAt` (unix ms) is since the start of today. */
export function isSyncedToday(syncedAt: number, now = new Date()) {
  return syncedAt >= new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** When a statement was last synced, e.g. "updated 14:05", "updated 10 Nov, 14:05", or "not updated yet". */
export function formatSyncTime(syncedAt: number, now = new Date()) {
  if (!syncedAt) return "not updated yet";
  const date = new Date(syncedAt);
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isSyncedToday(syncedAt, now)) return `updated ${time}`;
  return `updated ${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${time}`;
}
