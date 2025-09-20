import { Account, Jar, RateResponse } from "../../types";

export function calculateTotal(accounts: (Account | Jar)[], rates: RateResponse[]) {
  return accounts.reduce((total, account) => {
    if (account.currency.code === "UAH") return total + account.balance;
    const rate = rates.find((rate) => rate.currencyCodeA === +account.currency.number);

    if (!rate) return total;

    return total + account.balance * rate.rateSell;
  }, 0);
}
