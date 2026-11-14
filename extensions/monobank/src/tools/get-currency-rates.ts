import { toLocalIso } from "../services/format";
import { loadRates } from "../services/rates";

type Input = {
  /**
   * ISO 4217 letter codes to show rates for, e.g. ["USD", "EUR"]. Convert currency names first: гривня → UAH,
   * долар → USD, євро → EUR, злотий → PLN, фунт → GBP. Leave out to get every pair monobank has.
   */
  currencies?: string[];
};

/**
 * Get monobank's current currency exchange rates. Each pair "A/B" gives how many units of B one unit of A costs:
 * `buy` is the rate at which monobank buys A from the user, `sell` the rate at which it sells A to the user, and
 * `cross` a single rate for pairs without buy and sell rates.
 *
 * To convert an amount, use `convert-currency` instead.
 */
export default async function tool(input: Input) {
  const { rates, stale, updatedAt } = await loadRates();
  const codes = input.currencies?.map((code) => code.trim().toUpperCase()).filter(Boolean) ?? [];

  const pairs = rates
    .filter((rate) => !codes.length || codes.includes(rate.currencyA.code) || codes.includes(rate.currencyB.code))
    .map((rate) => ({
      pair: `${rate.currencyA.code}/${rate.currencyB.code}`,
      currencyA: { code: rate.currencyA.code, name: rate.currencyA.name },
      currencyB: { code: rate.currencyB.code, name: rate.currencyB.name },
      buy: rate.rateBuy,
      sell: rate.rateSell,
      cross: rate.rateCross,
      date: toLocalIso(rate.date),
    }));

  return {
    pairs,
    notFound: codes.filter(
      (code) => !rates.some((rate) => rate.currencyA.code === code || rate.currencyB.code === code),
    ),
    stale,
    updatedAt: new Date(updatedAt).toISOString(),
  };
}
