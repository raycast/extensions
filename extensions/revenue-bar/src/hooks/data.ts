import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { CombinedSummary, combineSummaries, mergeSales, settleAll, successes } from "../core/aggregate";
import { serializeError } from "../core/errors";
import { ConvertedTotal, convertTotal, needsRates } from "../core/fx";
import { SubscriptionMetrics, subscriptionMetrics } from "../core/subscriptions";
import { DateRange, RangeId, resolveRange } from "../core/ranges";
import { Customer, ProviderId, ProviderResult, Refund, Sale, Subscription, Summary } from "../providers/types";
import { providersFor } from "./useProviders";
import { ratesFor } from "./runtime";

/** Errors that escape a loader (rare: provider errors are captured per provider) get the standard utils toast. */
function viewErrorHandler(title: string) {
  return (error: Error) => {
    void showFailureToast(serializeError(error).message, { title });
  };
}

export type SummariesData = {
  range: DateRange;
  results: ProviderResult<Summary>[];
  combined: CombinedSummary;
  displayCurrency: string;
  fxError?: string;
  fetchedAt: Date;
};

export async function loadSummaries(rangeId: RangeId, ids: ProviderId[], currency: string): Promise<SummariesData> {
  const range = resolveRange(rangeId);
  const results = await settleAll(providersFor(ids), (p) => p.summary(range));
  const summaries = successes(results);
  const amounts = summaries.flatMap((s) => [...s.gross, ...(s.net ?? []), ...s.refunds]);
  let fxError: string | undefined;
  let fx: Awaited<ReturnType<typeof ratesFor>> | undefined;
  if (needsRates(amounts, currency)) {
    try {
      fx = await ratesFor(currency);
    } catch (error) {
      fxError = serializeError(error).message;
    }
  }
  return {
    range,
    results,
    combined: combineSummaries(summaries, fx ?? { displayCurrency: currency }),
    displayCurrency: currency,
    fxError,
    fetchedAt: new Date(),
  };
}

export function useSummaries(rangeId: RangeId, ids: ProviderId[], currency: string, execute = true) {
  return useCachedPromise(loadSummaries, [rangeId, ids, currency], {
    keepPreviousData: true,
    execute: execute && ids.length > 0,
    onError: viewErrorHandler("Could not load revenue"),
  });
}

export type SalesData = { results: ProviderResult<Sale[]>[]; sales: Sale[]; fetchedAt: Date };

export async function loadSales(rangeId: RangeId, ids: ProviderId[], limit: number): Promise<SalesData> {
  const range = resolveRange(rangeId);
  const results = await settleAll(providersFor(ids), (p) => p.sales(range, { limit }));
  return { results, sales: mergeSales(successes(results), limit), fetchedAt: new Date() };
}

export function useSales(rangeId: RangeId, ids: ProviderId[], limit: number, execute = true) {
  return useCachedPromise(loadSales, [rangeId, ids, limit], {
    keepPreviousData: true,
    execute: execute && ids.length > 0,
    onError: viewErrorHandler("Could not load sales"),
  });
}

export type RefundsData = { results: ProviderResult<Refund[]>[]; refunds: Refund[]; fetchedAt: Date };

export async function loadRefunds(ids: ProviderId[]): Promise<RefundsData> {
  const range = resolveRange("30d");
  const results = await settleAll(providersFor(ids), (p) => p.refunds(range));
  const refunds = successes(results)
    .flat()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return { results, refunds, fetchedAt: new Date() };
}

export function useRefunds(ids: ProviderId[], execute = true) {
  return useCachedPromise(loadRefunds, [ids], {
    keepPreviousData: true,
    execute: execute && ids.length > 0,
    onError: viewErrorHandler("Could not load refunds"),
  });
}

export type SubscriptionsData = {
  results: ProviderResult<Subscription[]>[];
  subscriptions: Subscription[];
  metrics: SubscriptionMetrics;
  /** MRR in the display currency, when rates are available or not needed. */
  mrrConverted?: ConvertedTotal;
  fxError?: string;
  monthStart: Date;
  /** Providers that have no subscription API (Gumroad). */
  unsupported: ProviderId[];
  fetchedAt: Date;
};

export async function loadSubscriptions(ids: ProviderId[], currency: string): Promise<SubscriptionsData> {
  const monthStart = resolveRange("mtd").start;
  const providers = providersFor(ids);
  const supported = providers.filter((p) => p.subscriptions !== undefined);
  const results = await settleAll(supported, (p) =>
    (p.subscriptions as NonNullable<typeof p.subscriptions>).call(p, { cancelledSince: monthStart }),
  );
  const subscriptions = successes(results).flat();
  const metrics = subscriptionMetrics(subscriptions, monthStart);
  let mrrConverted: ConvertedTotal | undefined;
  let fxError: string | undefined;
  if (!needsRates(metrics.mrr, currency)) {
    mrrConverted = convertTotal(metrics.mrr, { base: currency, date: "", rates: {}, fetchedAt: 0 });
  } else {
    try {
      mrrConverted = convertTotal(metrics.mrr, (await ratesFor(currency)).rates);
    } catch (error) {
      fxError = serializeError(error).message;
    }
  }
  return {
    results,
    subscriptions,
    metrics,
    mrrConverted,
    fxError,
    monthStart,
    unsupported: providers.filter((p) => p.subscriptions === undefined).map((p) => p.id),
    fetchedAt: new Date(),
  };
}

export function useSubscriptions(ids: ProviderId[], currency: string, execute = true) {
  return useCachedPromise(loadSubscriptions, [ids, currency], {
    keepPreviousData: true,
    execute: execute && ids.length > 0,
    onError: viewErrorHandler("Could not load subscriptions"),
  });
}

export type CustomerSearchData = { results: ProviderResult<Customer[]>[]; customers: Customer[] };

export async function searchCustomers(email: string, ids: ProviderId[]): Promise<CustomerSearchData> {
  const results = await settleAll(providersFor(ids), (p) => p.searchCustomers(email));
  return { results, customers: successes(results).flat() };
}

export function looksLikeEmail(text: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text.trim());
}

export function useCustomerSearch(email: string, ids: ProviderId[], execute = true) {
  return useCachedPromise(searchCustomers, [email.trim(), ids], {
    keepPreviousData: true,
    execute: execute && ids.length > 0 && looksLikeEmail(email),
    onError: viewErrorHandler("Could not search customers"),
  });
}

export async function loadCustomerSales(customer: Customer): Promise<Sale[]> {
  const [provider] = providersFor([customer.provider]);
  if (!provider?.salesForCustomer) return [];
  const sales = await provider.salesForCustomer(customer);
  return mergeSales([sales]);
}

export function useCustomerSales(customer: Customer) {
  return useCachedPromise(loadCustomerSales, [customer], {
    keepPreviousData: true,
    onError: viewErrorHandler("Could not load the customer's orders"),
  });
}
