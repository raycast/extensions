import cc from "currency-codes";
import { Currency, Jar, JarResponse } from "../../types";

export function transformJar(jar: JarResponse): Jar {
  const { currencyCode, balance, goal, ...other } = jar;
  const currencyCodeRecord = cc.number(currencyCode.toString())!;

  const currency: Currency = {
    name: currencyCodeRecord.currency,
    code: currencyCodeRecord.code,
    number: currencyCodeRecord.number,
  };

  return {
    currency,
    balance: balance / 100,
    goal: goal / 100,
    ...other,
  };
}
