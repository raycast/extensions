import cc from "currency-codes";
import { RateResponse } from "../../types";

export function filterRates(rates: RateResponse[]) {
  const currencySet = new Set<number>();

  return rates.filter((record) => {
    const currencyA = cc.number(record.currencyCodeA.toString());
    const currencyB = cc.number(record.currencyCodeB.toString());

    if (!currencyA) return false;
    if (!currencyB) return false;

    if (!currencySet.has(record.currencyCodeA)) {
      currencySet.add(record.currencyCodeA);
    }

    if (!currencySet.has(record.currencyCodeB)) {
      currencySet.add(record.currencyCodeB);
    }

    return true;
  });
}
