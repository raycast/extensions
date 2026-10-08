import { serializeError } from "./errors";
import { ConvertedTotal, FxRates, convertTotal } from "./fx";
import { Money, addMoney, sumByCurrency } from "./money";
import { DateRange } from "./ranges";
import { Provider, ProviderId, ProviderResult, Refund, Sale, Summary, isCollected } from "../providers/types";

/** Builds a Summary from already-filtered sales and refunds. Shared by every adapter so the rules are identical. */
export function summarizeSales(args: {
  provider: ProviderId;
  range: DateRange;
  sales: Sale[];
  refunds: Money[];
  partial: boolean;
  now: Date;
}): Summary {
  const collected = args.sales.filter((s) => isCollected(s.status));
  const fees = collected.flatMap((s) => (s.fee ? [s.fee] : []));
  const everyNetKnown = collected.length > 0 && collected.every((s) => s.net !== undefined);
  return {
    provider: args.provider,
    range: args.range,
    gross: sumByCurrency(collected.map((s) => s.gross)),
    net: everyNetKnown ? sumByCurrency(collected.map((s) => s.net as Money)) : undefined,
    fees: fees.length > 0 ? sumByCurrency(fees) : undefined,
    refunds: sumByCurrency(args.refunds),
    count: collected.length,
    partial: args.partial,
    fetchedAt: args.now,
  };
}

export function refundAmounts(refunds: Refund[]): Money[] {
  return refunds.filter((r) => r.kind === "refund").map((r) => r.amount);
}

export type CombinedSummary = {
  gross: Money[];
  net?: Money[];
  refunds: Money[];
  count: number;
  partial: boolean;
  providers: ProviderId[];
  /** Totals in the display currency, when rates were available. */
  converted?: {
    gross: ConvertedTotal;
    net?: ConvertedTotal;
    refunds: ConvertedTotal;
    ratesDate: string;
    stale: boolean;
  };
};

export function combineSummaries(
  summaries: Summary[],
  fx?: { rates: FxRates; stale: boolean } | { displayCurrency: string },
): CombinedSummary {
  const gross = addMoney(summaries.map((s) => s.gross));
  const allNet = summaries.length > 0 && summaries.every((s) => s.net !== undefined);
  const net = allNet ? addMoney(summaries.map((s) => s.net as Money[])) : undefined;
  const refunds = addMoney(summaries.map((s) => s.refunds));
  const combined: CombinedSummary = {
    gross,
    net,
    refunds,
    count: summaries.reduce((sum, s) => sum + s.count, 0),
    partial: summaries.some((s) => s.partial),
    providers: summaries.map((s) => s.provider),
  };
  if (fx && "rates" in fx) {
    combined.converted = {
      gross: convertTotal(gross, fx.rates),
      net: net ? convertTotal(net, fx.rates) : undefined,
      refunds: convertTotal(refunds, fx.rates),
      ratesDate: fx.rates.date,
      stale: fx.stale,
    };
  } else if (fx && "displayCurrency" in fx && everyAmountIn([gross, net ?? [], refunds], fx.displayCurrency)) {
    // Everything is already in the display currency: no rates needed.
    const identity: FxRates = { base: fx.displayCurrency, date: "", rates: {}, fetchedAt: 0 };
    combined.converted = {
      gross: convertTotal(gross, identity),
      net: net ? convertTotal(net, identity) : undefined,
      refunds: convertTotal(refunds, identity),
      ratesDate: "",
      stale: false,
    };
  }
  return combined;
}

function everyAmountIn(lists: Money[][], currency: string): boolean {
  return lists.every((list) => list.every((m) => m.currency === currency || m.amountMinor === 0));
}

/**
 * Runs `fn` for every provider with Promise.allSettled, so one failing provider never blanks the others.
 * Failures are serialized (and redacted) so the result can live in the Raycast cache.
 */
export async function settleAll<T>(
  providers: Provider[],
  fn: (provider: Provider) => Promise<T>,
): Promise<ProviderResult<T>[]> {
  const settled = await Promise.allSettled(providers.map((p) => fn(p)));
  return settled.map((outcome, index) => {
    const provider = (providers[index] as Provider).id;
    if (outcome.status === "fulfilled") {
      return { provider, ok: true as const, data: outcome.value };
    }
    const error = serializeError(outcome.reason);
    return { provider, ok: false as const, error: { kind: error.kind, message: error.message } };
  });
}

export function successes<T>(results: ProviderResult<T>[]): T[] {
  return results.flatMap((r) => (r.ok ? [r.data] : []));
}

export function failures<T>(results: ProviderResult<T>[]): Extract<ProviderResult<T>, { ok: false }>[] {
  return results.filter((r): r is Extract<ProviderResult<T>, { ok: false }> => !r.ok);
}

/** Merges sale lists from several providers, newest first. */
export function mergeSales(lists: Sale[][], limit?: number): Sale[] {
  const merged = lists.flat().sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return limit === undefined ? merged : merged.slice(0, limit);
}
