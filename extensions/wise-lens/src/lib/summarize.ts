import { outflowAmount, parseAmount } from "./classify";
import { ActivitySummary, WiseActivity } from "./types";

type RateLookup = (from: string, to: string) => number | null | Promise<number | null>;

export async function summarizeActivities(
  activities: WiseActivity[],
  summaryCurrency: string,
  getRate: RateLookup,
  recentCount = 8,
): Promise<ActivitySummary> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const outflows: { date: Date; value: number; currency: string }[] = [];
  const currencies = new Set<string>();
  for (const a of activities) {
    if (a.status !== "COMPLETED") continue;
    const o = outflowAmount(a);
    if (!o) continue;
    outflows.push({ date: new Date(a.createdOn), value: o.value, currency: o.currency });
    currencies.add(o.currency);
  }

  // Resolve each distinct outflow currency to summaryCurrency once.
  const rates = new Map<string, number | null>();
  await Promise.all(
    [...currencies].map(async (c) => {
      rates.set(c, c === summaryCurrency ? 1 : await getRate(c, summaryCurrency));
    }),
  );

  let spent30 = 0;
  let spentMonth = 0;
  for (const o of outflows) {
    const rate = rates.get(o.currency);
    if (rate == null) continue; // no rate available — skip rather than mix currencies
    const amount = o.value * rate;
    if (o.date >= thirtyDaysAgo) spent30 += amount;
    if (o.date >= monthStart) spentMonth += amount;
  }

  const recent = activities.slice(0, recentCount);
  return { spent30, spentMonth, recent };
}

export function inferPrimaryCurrency(activities: WiseActivity[]): string {
  for (const a of activities) {
    const c = parseAmount(a.primaryAmount)?.currency;
    if (c) return c;
  }
  return "EUR";
}
