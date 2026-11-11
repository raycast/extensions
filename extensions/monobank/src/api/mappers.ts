import { Account, AccountType, CashbackType, ClientInfo, Currency, CurrencyRate, Jar, Transaction } from "../types";
import { fromMinorUnits, isKnownCurrency, toCurrency, toCurrencyOrUnknown } from "../utils/currency";
import { getCategory } from "../utils/mcc";
import { isJarTopUp, SAVINGS_CATEGORY } from "../utils/savings";
import { AccountResponse, ClientInfoResponse, CurrencyRateResponse, JarResponse, StatementItemResponse } from "./types";

// Fields are mapped one by one, so fields the API adds later never reach domain objects or the cache.

export function toAccount(account: AccountResponse): Account {
  return {
    id: account.id,
    title: "",
    sendId: account.sendId,
    balance: account.balance / 100,
    creditLimit: account.creditLimit / 100,
    // The domain enums have the same values as the API.
    type: account.type as AccountType,
    currency: toCurrency(account.currencyCode),
    cashbackType: account.cashbackType as CashbackType,
    maskedPan: account.maskedPan,
    iban: account.iban,
  };
}

export function toJar(jar: JarResponse): Jar {
  return {
    id: jar.id,
    sendId: jar.sendId,
    title: jar.title,
    description: jar.description,
    currency: toCurrency(jar.currencyCode),
    balance: jar.balance / 100,
    goal: jar.goal / 100,
  };
}

/**
 * Keeps custom titles from `previous`, which only exist locally. They are matched by account ID, so a
 * previous cache from another token only contributes titles of accounts this token can see.
 *
 * `scope` is the token fingerprint. The jar title history (see `ClientInfo.jarTitleHistory`) adds the previous
 * jars and the current ones, and starts over when `previous` belongs to another token.
 */
export function toClientInfo(response: ClientInfoResponse, previous: ClientInfo, scope: string): ClientInfo {
  const accounts = response.accounts.map(toAccount).map((account) => {
    const savedAccount = previous.accounts.find((saved) => saved.id === account.id);
    return savedAccount ? { ...account, title: savedAccount.title } : account;
  });
  const jars = response.jars?.map(toJar) ?? [];

  const isSameScope = previous.jarTitleHistory?.scope === scope;
  const titles = [
    ...(isSameScope ? (previous.jarTitleHistory?.titles ?? []) : []),
    ...(isSameScope ? previous.jars.map((jar) => jar.title) : []),
    ...jars.map((jar) => jar.title),
  ].filter(Boolean);

  return { name: response.name, accounts, jars, jarTitleHistory: { scope, titles: [...new Set(titles)] } };
}

/** Whether both currencies are known to `currency-codes`, which `toCurrencyRate` requires. */
export function isSupportedRate(rate: CurrencyRateResponse) {
  return isKnownCurrency(rate.currencyCodeA) && isKnownCurrency(rate.currencyCodeB);
}

/** Callers must only pass rates that pass `isSupportedRate`. */
export function toCurrencyRate(rate: CurrencyRateResponse): CurrencyRate {
  const currencyA = toCurrency(rate.currencyCodeA);
  const currencyB = toCurrency(rate.currencyCodeB);

  return {
    id: `${currencyA.number}-${currencyB.number}`,
    currencyA,
    currencyB,
    date: rate.date,
    rateBuy: rate.rateBuy,
    rateSell: rate.rateSell,
    rateCross: rate.rateCross,
  };
}

/**
 * `currency` is the currency of the account or jar the statement belongs to. `jarTitles` (from `getJarTitles`) are
 * the user's jars: transfers to them get the Savings category. `mcc` stays as monobank sent it.
 */
export function toTransaction(
  item: StatementItemResponse,
  currency: Currency,
  jarTitles: readonly string[] = [],
): Transaction {
  const operationCurrency = toCurrencyOrUnknown(item.currencyCode);

  return {
    id: item.id,
    time: item.time,
    description: item.description,
    mcc: item.mcc,
    originalMcc: item.originalMcc,
    category: isJarTopUp(item, jarTitles) ? SAVINGS_CATEGORY : getCategory(item.mcc),
    hold: item.hold,
    amount: fromMinorUnits(item.amount, currency),
    currency,
    operationAmount: fromMinorUnits(item.operationAmount, operationCurrency),
    operationCurrency,
    commission: fromMinorUnits(item.commissionRate, currency),
    cashback: fromMinorUnits(item.cashbackAmount, currency),
    balance: fromMinorUnits(item.balance, currency),
    comment: item.comment || undefined,
    receiptId: item.receiptId || undefined,
    invoiceId: item.invoiceId || undefined,
    counterEdrpou: item.counterEdrpou || undefined,
    counterIban: item.counterIban || undefined,
    counterName: item.counterName || undefined,
  };
}
