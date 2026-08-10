import { toshl } from "../utils/toshl";
import { AI_INSTRUCTIONS } from "../utils/helpers";
import { format, subDays } from "date-fns";

type Input = {
  from?: string;
  to?: string;
  /** ISO 4217 — Toshl requires this on `/tags/sums`; defaults to your main currency from `/me`. */
  currency?: string;
  /** expense | income — if supported by API */
  type?: string;
};

export default async function getTagSums(input: Input) {
  const today = new Date();
  const from = input.from || format(subDays(today, 30), "yyyy-MM-dd");
  const to = input.to || format(today, "yyyy-MM-dd");
  const currency = input.currency?.trim() || (await toshl.getDefaultCurrency());

  const data = await toshl.getTagSums({ from, to, currency, type: input.type });

  return {
    from,
    to,
    currency,
    sums: data,
    _instructions: AI_INSTRUCTIONS,
  };
}
