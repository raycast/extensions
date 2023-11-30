import cc from "currency-codes";
import { Currency, Jar, JarResponse } from "../../types";
import { getEmojiByCurrencyCode } from "../common/getEmojiByCurrencyCode";

export function transformJar(jar: JarResponse): Jar {
  const { currencyCode, balance, goal, ...other } = jar;
  const currencyCodeRecord = cc.number(currencyCode.toString())!;

  const currency: Currency = {
    name: currencyCodeRecord.currency,
    code: currencyCodeRecord.code,
    number: currencyCodeRecord.number,
    flag: getEmojiByCurrencyCode(currencyCodeRecord.code),
  };

  return {
    currency,
    balance: balance / 100,
    goal: goal / 100,
    ...other,
  };
}
