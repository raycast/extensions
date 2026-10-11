import { Action, ActionPanel, Color, Detail, Icon, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { copyReportToClipboard, exportReportToFile } from "./export";
import { useSubscriptions } from "./storage";
import { Subscription } from "./types";
import {
  formatCurrency,
  getMissingRateCurrencies,
  getMissingRateCurrenciesForSubscriptions,
  getMonthlyEquivalent,
  getMonthlyTotal,
  getNextBillingDate,
  getSubscriptionIcon,
} from "./utils";

type GroupBy = "category" | "cycle" | "list";

interface RatesResponse {
  rates: Record<string, number>;
}

function buildBar(pct: number, width = 12): string {
  const filled = Math.round((pct / 100) * width);
  return "█".repeat(filled) + "░".repeat(Math.max(0, width - filled));
}

export default function AnalyticsCommand() {
  const { subscriptions, isLoading } = useSubscriptions();
  const prefs = getPreferenceValues<Preferences>();
  const [groupBy, setGroupBy] = useState<GroupBy>("category");

  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();
  const monthName = today.toLocaleString("default", { month: "long" });
  const lastMonth = month === 0 ? 11 : month - 1;
  const lastMonthYear = month === 0 ? year - 1 : year;

  const { data: ratesData } = useFetch<RatesResponse>(
    `https://api.frankfurter.app/latest?from=${prefs.primaryCurrency}`,
    { keepPreviousData: true },
  );
  const rates = ratesData?.rates;

  const active = subscriptions.filter((s) => s.status === "active");
  const paused = subscriptions.filter((s) => s.status === "paused");

  function toMonthlyPrimary(sub: Subscription): number | null {
    const monthly = getMonthlyEquivalent(sub.amount, sub.billingCycle);
    if (sub.currency === prefs.primaryCurrency) return monthly;
    const rate = rates?.[sub.currency];
    return rate ? monthly / rate : null;
  }

  const thisMonthTotal = getMonthlyTotal(subscriptions, month, year, prefs.primaryCurrency, rates);
  const lastMonthTotal = getMonthlyTotal(subscriptions, lastMonth, lastMonthYear, prefs.primaryCurrency, rates);
  const activeMonthlyTotal = active.reduce((sum, s) => sum + (toMonthlyPrimary(s) ?? 0), 0);
  const yearlyForecast = activeMonthlyTotal * 12;
  const missingRateCurrencies = [
    ...new Set([
      ...getMissingRateCurrencies(subscriptions, month, year, prefs.primaryCurrency, rates),
      ...getMissingRateCurrencies(subscriptions, lastMonth, lastMonthYear, prefs.primaryCurrency, rates),
      ...getMissingRateCurrenciesForSubscriptions(active, prefs.primaryCurrency, rates),
    ]),
  ].sort();

  const groups: Record<string, Subscription[]> = {};
  for (const sub of active) {
    const key = groupBy === "category" ? sub.category : groupBy === "cycle" ? sub.billingCycle : sub.list;
    if (!groups[key]) groups[key] = [];
    groups[key].push(sub);
  }
  const groupTotals = Object.entries(groups)
    .map(([key, subs]) => ({
      key,
      total: subs.reduce((sum, s) => sum + (toMonthlyPrimary(s) ?? 0), 0),
      count: subs.length,
    }))
    .sort((a, b) => b.total - a.total);

  const topSubs = [...active]
    .map((sub) => ({ sub, monthly: toMonthlyPrimary(sub) }))
    .filter((item): item is { sub: Subscription; monthly: number } => item.monthly !== null)
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 5);

  let nextBill: { name: string; daysAway: number } | null = null;
  for (const sub of active) {
    const next = getNextBillingDate(sub);
    if (!next) continue;
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const days = Math.round((next.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
    if (!nextBill || days < nextBill.daysAway) nextBill = { name: sub.name, daysAway: days };
  }

  const monthDiff = thisMonthTotal - lastMonthTotal;
  const monthDiffPct = lastMonthTotal > 0 ? (monthDiff / lastMonthTotal) * 100 : 0;
  const trendSymbol = monthDiff >= 0 ? "↑" : "↓";
  const trendStr = `${trendSymbol} ${formatCurrency(Math.abs(monthDiff), prefs.primaryCurrency)} (${monthDiff >= 0 ? "+" : "-"}${Math.abs(monthDiffPct).toFixed(1)}%) vs last month`;

  const groupLabel = groupBy === "category" ? "Category" : groupBy === "cycle" ? "Billing Cycle" : "List";

  const breakdownRows = groupTotals
    .map(({ key, total, count }) => {
      const pct = activeMonthlyTotal > 0 ? (total / activeMonthlyTotal) * 100 : 0;
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      return `| ${label} | \`${buildBar(pct)}\` | ${formatCurrency(total, prefs.primaryCurrency)} | ${pct.toFixed(0)}% | ${count} sub${count !== 1 ? "s" : ""} |`;
    })
    .join("\n");

  const topRows = topSubs
    .map(({ sub, monthly }, i) => `| ${i + 1} | ${sub.name} | ${formatCurrency(monthly, prefs.primaryCurrency)} /mo |`)
    .join("\n");

  const lastMonthName = new Date(lastMonthYear, lastMonth, 1).toLocaleString("default", { month: "long" });

  const markdown = `
## ${monthName} ${year} · ${formatCurrency(thisMonthTotal, prefs.primaryCurrency)}

---

### By ${groupLabel}

| | | Amount | Share | |
|:--|:--|--:|--:|:--|
${breakdownRows}

---

### Top Expenses

| # | Service | Monthly Cost |
|:--|:--|--:|
${topRows}

${missingRateCurrencies.length > 0 ? `> Partial totals: missing exchange rates for ${missingRateCurrencies.join(", ")}.\n` : ""}

---

### Month Comparison

| Month | Amount | Change |
|:--|--:|--:|
| ${monthName} ${year} | ${formatCurrency(thisMonthTotal, prefs.primaryCurrency)} | — |
| ${lastMonthName} ${lastMonthYear} | ${formatCurrency(lastMonthTotal, prefs.primaryCurrency)} | ${trendStr} |
`.trim();

  const mostExpensive = topSubs[0];

  return (
    <Detail
      navigationTitle="Analytics"
      isLoading={isLoading}
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title={missingRateCurrencies.length > 0 ? "Monthly Total (Partial)" : "Monthly Total"}
            text={formatCurrency(thisMonthTotal, prefs.primaryCurrency)}
            icon={Icon.BankNote}
          />
          {missingRateCurrencies.length > 0 && (
            <Detail.Metadata.Label
              title="Missing Rates"
              text={missingRateCurrencies.join(", ")}
              icon={Icon.ExclamationMark}
            />
          )}
          <Detail.Metadata.Label
            title="Yearly Forecast"
            text={formatCurrency(yearlyForecast, prefs.primaryCurrency)}
            icon={Icon.Calendar}
          />
          <Detail.Metadata.Label
            title="Avg Cost / Sub"
            text={active.length > 0 ? formatCurrency(activeMonthlyTotal / active.length, prefs.primaryCurrency) : "—"}
            icon={Icon.BarChart}
          />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Active"
            text={`${active.length} subscription${active.length !== 1 ? "s" : ""}`}
            icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          />
          <Detail.Metadata.Label
            title="Paused"
            text={`${paused.length} subscription${paused.length !== 1 ? "s" : ""}`}
            icon={{ source: Icon.Pause, tintColor: Color.Yellow }}
          />
          <Detail.Metadata.Separator />
          {mostExpensive && (
            <Detail.Metadata.Label
              title="Most Expensive"
              text={`${mostExpensive.sub.name} · ${formatCurrency(mostExpensive.monthly, prefs.primaryCurrency)} /mo`}
              icon={getSubscriptionIcon(mostExpensive.sub)}
            />
          )}
          {nextBill && (
            <Detail.Metadata.Label
              title="Next Bill"
              text={`${nextBill.name} · in ${nextBill.daysAway} day${nextBill.daysAway !== 1 ? "s" : ""}`}
              icon={Icon.Clock}
            />
          )}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Group By">
            <Action title="By Category" icon={Icon.Tag} onAction={() => setGroupBy("category")} />
            <Action title="By Billing Cycle" icon={Icon.ArrowClockwise} onAction={() => setGroupBy("cycle")} />
            <Action title="By List" icon={Icon.List} onAction={() => setGroupBy("list")} />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <ActionPanel.Submenu
              title="Export Report"
              icon={Icon.Download}
              shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
            >
              <Action title="Copy as Markdown" icon={Icon.Clipboard} onAction={() => copyReportToClipboard(markdown)} />
              <Action
                title="Save as Markdown"
                icon={Icon.Document}
                onAction={() => exportReportToFile(markdown, "subscription-report")}
              />
            </ActionPanel.Submenu>
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
