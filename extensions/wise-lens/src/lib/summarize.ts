import { outflowInCurrency } from "./classify";
import { ActivitySummary, WiseActivity } from "./types";

export function summarizeActivities(
  activities: WiseActivity[],
  displayCurrency: string,
  recentCount = 8,
): ActivitySummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  let spent30 = 0;
  let spentMonth = 0;
  for (const a of activities) {
    if (a.status !== "COMPLETED") continue;
    const amount = outflowInCurrency(a, displayCurrency);
    if (!amount) continue;
    const date = new Date(a.createdOn);
    if (date >= thirtyDaysAgo) spent30 += amount;
    if (date >= monthStart) spentMonth += amount;
  }

  const recent = activities.slice(0, recentCount);
  return { spent30, spentMonth, recent };
}

export function inferPrimaryCurrency(activities: WiseActivity[]): string {
  for (const a of activities) {
    const m = (a.primaryAmount ?? "").match(/[A-Z]{3}$/);
    if (m) return m[0];
  }
  return "EUR";
}
