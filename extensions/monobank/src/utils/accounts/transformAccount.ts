import cc from "currency-codes";
import { Account, AccountResponse, Currency } from "../../types";

export function transformAccount(account: AccountResponse): Account {
  const { currencyCode, balance, creditLimit, ...other } = account;
  const currencyCodeRecord = cc.number(currencyCode.toString())!;

  const currency: Currency = {
    name: currencyCodeRecord.currency,
    code: currencyCodeRecord.code,
    number: currencyCodeRecord.number,
  };

  return {
    title: "",
    currency,
    balance: balance / 100,
    creditLimit: creditLimit / 100,
    ...other,
  };
}
