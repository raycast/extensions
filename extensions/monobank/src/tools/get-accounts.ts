import { loadClientInfo } from "../services/clientInfo";
import { getDisplayNames, roundAmount } from "../services/format";
import { loadRates } from "../services/rates";
import { Account, CurrencyRate, Jar } from "../types";
import { calculateTotal, getSendUrl, hasTopUpPage } from "../utils/accounts";

/**
 * Get the user's monobank accounts (cards and FOP accounts) and jars ("банки", "збори"): names, balances,
 * own funds, credit limits, card numbers, IBANs, jar goals and progress, and top-up page links.
 *
 * Use it for questions about balances, money available, jars and their goals, and top-up links, and to find
 * the `id` of an account or jar the user names before calling `get-transactions`.
 *
 * Names are user-defined and may be in any language: match the user's words by meaning, not exact text.
 *
 * Returned fields: an account's `balance` includes its credit limit, and `ownFunds` (balance minus credit limit)
 * is the user's own money. `isDefault` marks the account used when none is named. A jar's `goal` is `null` when
 * it has none. `totals` has the own funds of all accounts and the money in all jars converted to UAH; it's
 * missing when currency rates couldn't be loaded. `stale` means monobank couldn't be reached and the data
 * is from `updatedAt`.
 */
export default async function tool() {
  const [{ clientInfo, items, pinnedIds, defaultItem, stale, updatedAt }, rates] = await Promise.all([
    loadClientInfo(),
    // Totals are optional, so failing to load rates doesn't fail the tool.
    loadRates().catch((error) => {
      console.error(error);
      return undefined;
    }),
  ]);
  const names = getDisplayNames(items);

  const accounts = clientInfo.accounts.map((account) => ({
    id: account.id,
    name: names.get(account.id),
    customName: account.title || undefined,
    type: account.type,
    currency: account.currency.code,
    balance: account.balance,
    creditLimit: account.creditLimit,
    ownFunds: getOwnFunds(account),
    cards: account.maskedPan,
    iban: account.iban,
    isDefault: account.id === defaultItem?.id,
    isPinned: pinnedIds.includes(account.id),
    topUpUrl: hasTopUpPage(account) ? getSendUrl(account.sendId) : undefined,
  }));

  const jars = clientInfo.jars.map((jar) => {
    const goal = jar.goal || null;
    return {
      id: jar.id,
      name: names.get(jar.id),
      description: jar.description || undefined,
      currency: jar.currency.code,
      balance: jar.balance,
      goal,
      remainingToGoal: goal === null ? null : roundAmount(Math.max(goal - jar.balance, 0), jar.currency),
      progressPercent: goal === null ? null : Math.round((jar.balance / goal) * 1000) / 10,
      goalReached: goal !== null && jar.balance >= goal,
      isDefault: jar.id === defaultItem?.id,
      isPinned: pinnedIds.includes(jar.id),
      topUpUrl: jar.sendId ? getSendUrl(jar.sendId) : undefined,
    };
  });

  return {
    accounts,
    jars,
    totals: rates && getTotals(clientInfo.accounts, clientInfo.jars, rates.rates),
    stale,
    updatedAt: new Date(updatedAt).toISOString(),
  };
}

function getOwnFunds(account: Account) {
  return roundAmount(account.balance - account.creditLimit, account.currency);
}

function getTotals(accounts: Account[], jars: Jar[], rates: CurrencyRate[]) {
  const ownFunds = accounts.map((account) => ({ ...account, balance: getOwnFunds(account) }));
  const round = (amount: number) => Math.round(amount * 100) / 100;

  return {
    currency: "UAH",
    accountsOwnFunds: round(calculateTotal(ownFunds, rates)),
    jars: round(calculateTotal(jars, rates)),
    note: "Other currencies are converted at monobank's sell rate (cross rate where there is none). Items in a currency without a UAH rate are left out.",
  };
}
