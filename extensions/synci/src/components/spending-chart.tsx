import { Action, ActionPanel, Detail, environment, Icon } from "@raycast/api";
import type { ReactElement } from "react";
import { historyChart } from "../lib/chart";
import { PERIODS } from "../lib/finance";
import { markdown, money } from "../lib/format";
import { spendingTrend } from "../lib/spending-trend";
import type { Period, Transaction } from "../lib/types";

export function SpendingChart({
  transactions,
  period,
  currency,
  account,
  transactionsView,
}: {
  transactions: Transaction[];
  period: Period;
  currency: string;
  account: string;
  transactionsView: ReactElement;
}) {
  const trend = spendingTrend(transactions, currency, period);
  const chart = historyChart(trend.points, currency, environment.appearance === "dark");
  const title = PERIODS.find(({ value }) => value === period)?.title || "Recent Spending";
  const content = [
    `# ${markdown(money(trend.total, currency))}`,
    `${title} · ${markdown(account)} · Booked outflows`,
    chart ? `![Daily spending](${chart})` : "Not enough days in this period to draw a trend.",
    "Daily spending by booking date. Days without recorded outflows are shown as zero. Transfers and cash withdrawals may be included; pending transactions and incoming refunds are excluded.",
    trend.unplotted ? `${trend.unplotted} transactions without valid booking dates could not be plotted.` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <Detail
      navigationTitle={`${currency} Spending`}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.Push title="View Transactions" icon={Icon.Receipt} target={transactionsView} />
          <Action.CopyToClipboard title="Copy Spending Total" content={money(trend.total, currency)} />
        </ActionPanel>
      }
    />
  );
}
