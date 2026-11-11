import { toTransaction } from "../api/mappers";
import { budgetPresets } from "../data/budgetPresets";
import { BUDGET_SYNC_MAX_AGE } from "../data/constants";
import { readBudgetAccountIds, readBudgets } from "../services/budgets";
import { loadClientInfo, resolveToolAccount } from "../services/clientInfo";
import { getDisplayNames, roundAmount, toLocalIso } from "../services/format";
import { LoadedStatement, loadStatement } from "../services/statement";
import { Account } from "../types";
import { getBudgetMonth, getBudgetProgress, isBudgetEligible, resolveBudgetAccounts } from "../utils/budgets";
import { getJarTitles } from "../utils/savings";
import { resolvePeriod } from "../utils/statement";

type Input = {
  /**
   * The `id` of a UAH account from `get-accounts`, only when the user asks about the budgets of one account.
   * Leave out otherwise: every budget account is counted.
   */
  accountId?: string;
  /** "thisMonth" (цього місяця, the default) or "lastMonth" (минулого місяця). */
  month?: "thisMonth" | "lastMonth";
};

/**
 * Get the user's monthly budgets (spending limits per category, бюджети, ліміти) and how much of each is spent in
 * a calendar month across the budget accounts (the UAH cards the user chose in "Show Budgets", by default all
 * personal UAH cards): `spent`, `left` (negative when over), `percentUsed` and `status` ("ok", "warning" from 80%,
 * "over" above 100%), and `byAccount`, the spending per card. For the current month, `perDayLeft` is what can
 * still be spent per day (today included) and `projected` is the month's spending at the pace so far.
 *
 * Use it for "how much can I still spend on…", "скільки лишилось на…" and "am I over budget" questions. `accounts`
 * lists the cards counted: say how many and which. Amounts are in UAH. Refunds reduce spending, and transactions on
 * hold count.
 *
 * `incomplete: true` means some card has transactions in the month that aren't loaded (see `accounts`). `presets`
 * are ready-made budgets for `set-budget`. Each card's month is loaded within monobank's statement rate limit of
 * one request per minute, so with several cards this can take a few minutes.
 */
export default async function tool(input: Input) {
  const budgets = await readBudgets();
  const presets = budgetPresets.map((preset) => preset.name);

  if (!budgets.length) {
    return {
      budgets: [],
      presets,
      note: 'The user has no budgets yet. Suggest creating one with set-budget (a preset fits common categories) or in the "Show Budgets" command.',
    };
  }

  const loaded = await loadClientInfo();
  const names = getDisplayNames(loaded.items);
  const preset = input.month ?? "thisMonth";
  const month = getBudgetMonth({ preset })!;
  const summary = {
    month: month.label,
    budgets: budgets.map(({ id, name, categories, limit }) => ({ id, name, categories, limit })),
    presets,
  };

  let accounts: Account[];
  if (input.accountId) {
    const account = resolveToolAccount(loaded, input.accountId);
    if (!isBudgetEligible(account)) {
      return {
        account: { id: account.id, name: names.get(account.id), currency: account.currency.code },
        ...summary,
        note: "Budgets count spending on UAH cards and FOP accounts only, not jars or USD/EUR cards. Call get-accounts and pass a UAH account's id, or leave accountId out to count every budget account.",
      };
    }
    accounts = [account];
  } else {
    accounts = resolveBudgetAccounts(loaded.items, await readBudgetAccountIds());
  }

  if (!accounts.length) {
    return {
      accounts: [],
      ...summary,
      note: 'No UAH cards are chosen for budgets. Ask the user to pick them with "Choose Accounts…" in "Show Budgets".',
    };
  }

  // One at a time: each request waits for the rate limit the commands share.
  const { from, to } = resolvePeriod({ preset });
  const statements: { account: Account; statement: LoadedStatement }[] = [];
  for (const account of accounts) {
    statements.push({
      account,
      statement: await loadStatement(account.id, { from, to }, { staleAfter: BUDGET_SYNC_MAX_AGE }),
    });
  }

  // Transfers to jars become Savings, so they don't count toward a budget with "Money transfer".
  const jarTitles = getJarTitles(loaded.clientInfo);
  const groups = statements.map(({ account, statement }) => ({
    accountId: account.id,
    transactions: statement.items.map((item) => toTransaction(item, account.currency, jarTitles)),
  }));
  const round = (amount: number) => roundAmount(amount, accounts[0].currency);
  const now = Math.floor(Date.now() / 1000);

  return {
    accounts: statements.map(({ account, statement }) => ({
      id: account.id,
      name: names.get(account.id),
      updatedAt: statement.fetchedAt ? toLocalIso(Math.floor(statement.fetchedAt / 1000)) : undefined,
      incomplete: statement.incomplete,
      loadedSince: statement.loadedSince !== undefined ? toLocalIso(statement.loadedSince) : undefined,
    })),
    onlyAccountAsked: !!input.accountId,
    month: month.label,
    period: { from: toLocalIso(month.from), to: toLocalIso(Math.min(month.to, now)) },
    budgets: getBudgetProgress(budgets, groups, month).map((progress) => ({
      id: progress.budget.id,
      name: progress.budget.name,
      categories: progress.budget.categories,
      limit: progress.budget.limit,
      spent: round(progress.spent),
      left: round(progress.left),
      percentUsed: Math.round(progress.ratio * 100),
      status: progress.status,
      perDayLeft: progress.perDayLeft !== undefined ? round(progress.perDayLeft) : undefined,
      projected: progress.projected !== undefined ? round(progress.projected) : undefined,
      daysLeft: progress.daysLeft,
      byAccount: progress.byAccount.map((item) => ({ name: names.get(item.accountId), spent: round(item.spent) })),
    })),
    incomplete: statements.some(({ statement }) => statement.incomplete),
    presets,
  };
}
