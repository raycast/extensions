import { roundAmount, toLocalIso } from "../services/format";
import { loadRates } from "../services/rates";
import { convertAmount } from "../utils/rates";

type Input = {
  /** The amount to convert, in the `from` currency. A positive number, e.g. 500. */
  amount: number;
  /**
   * ISO 4217 letter code of the currency the user has, e.g. "UAH". гривня/гривні → UAH, долар → USD,
   * євро → EUR, злотий → PLN, фунт → GBP.
   */
  from: string;
  /** ISO 4217 letter code of the currency the user wants to get, e.g. "USD". */
  to: string;
};

/**
 * Convert an amount between currencies at monobank's current rates, the way the bank would exchange it:
 * buying a foreign currency uses monobank's sell rate, selling it uses the buy rate. "How much is 500 UAH
 * in USD" means `{ amount: 500, from: "UAH", to: "USD" }`. Pairs without a direct rate are converted through
 * UAH in two steps.
 *
 * Returns `result` in the `to` currency, and the rates used (`quote` reads "1 A = rate B").
 */
export default async function tool(input: Input) {
  const from = input.from.trim().toUpperCase();
  const to = input.to.trim().toUpperCase();
  const { amount } = input;

  if (!(amount > 0)) throw new Error("`amount` must be a positive number");

  const { rates, stale, updatedAt } = await loadRates();
  const known = new Set(rates.flatMap((rate) => [rate.currencyA.code, rate.currencyB.code]));

  for (const code of [from, to]) {
    if (!known.has(code)) {
      throw new Error(`monobank has no rate for "${code}". Use an ISO 4217 letter code, e.g. UAH, USD or EUR.`);
    }
  }

  if (from === to) {
    return { amount, from, to, result: amount, steps: [], stale, updatedAt: new Date(updatedAt).toISOString() };
  }

  const converted = convertAmount(rates, amount, from, to);
  if (!converted) throw new Error(`monobank has no rate to convert ${from} to ${to}`);

  const { steps } = converted;
  const usedSteps = steps.map(({ rate, conversion, amount: stepAmount, result: stepResult }) => ({
    from: conversion.from.code,
    to: conversion.to.code,
    amount: roundAmount(stepAmount, conversion.from),
    result: roundAmount(stepResult, conversion.to),
    rateType: conversion.rateType.toLowerCase(),
    quote: `1 ${rate.currencyA.code} = ${conversion.rate} ${rate.currencyB.code}`,
    ratesDate: toLocalIso(rate.date),
  }));

  return {
    amount,
    from,
    to,
    result: roundAmount(converted.result, steps[steps.length - 1].conversion.to),
    steps: usedSteps,
    stale,
    updatedAt: new Date(updatedAt).toISOString(),
  };
}
