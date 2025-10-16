import cc from "currency-codes";
import { CurrencyRate, RateResponse } from "../../types";
import { getEmojiByCurrencyCode } from "../common/getEmojiByCurrencyCode";

export function transformRate(rate: RateResponse): CurrencyRate {
  const currencyA = cc.number(rate.currencyCodeA.toString())!;
  const currencyB = cc.number(rate.currencyCodeB.toString())!;

  return {
    id: `${currencyA.number}-${currencyB.number}`,
    currencyA: {
      name: currencyA.currency,
      code: currencyA.code,
      number: currencyA.number,
      flag: getEmojiByCurrencyCode(currencyA.code),
    },
    currencyB: {
      name: currencyB.currency,
      code: currencyB.code,
      number: currencyA.number,
      flag: getEmojiByCurrencyCode(currencyB.code),
    },
    date: rate.date,
    rateBuy: rate.rateBuy,
    rateCross: rate.rateCross,
    rateSell: rate.rateSell,
  };
}
