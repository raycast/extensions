import { Action, ActionPanel, Color, Detail, environment, Icon, Keyboard } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { balanceChart } from "../chart";
import { formatCurrency, formatSignedCurrency } from "../format";
import { MercuryLogin } from "../logins";
import { log, TreasuryAccount } from "../mercury";
import { buildSeries, describe, getTreasuryTransactions, RangeKey, RANGES, securityNames } from "../treasury";
import { TreasuryTransactionList } from "./TreasuryTransactions";

const CHART_COLOR = "#5E6AD2";

function axisLabel(day: string, range: RangeKey) {
  const date = new Date(`${day}T12:00:00Z`);
  const long = range === "1y" || range === "all" || range === "ytd";
  return date.toLocaleDateString(
    "en-US",
    long ? { month: "short", year: "2-digit", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" },
  );
}

/** Treasury at a glance: balance, returns for a time range, a balance chart, and recent activity. */
export function TreasuryView({ login, account }: { login: MercuryLogin; account: TreasuryAccount }) {
  const [range, setRange] = useCachedState<RangeKey>("treasury-range", "3m");
  // Hiding the sidebar gives the chart and the activity table the full width.
  const [showingSidebar, setShowingSidebar] = useCachedState("treasury-sidebar", true);
  const {
    data: transactions,
    isLoading,
    error,
    revalidate,
  } = usePromise((_loginId: string, id: string) => getTreasuryTransactions(login, id), [login.id, account.id], {
    onError: (error) => log.error("Couldn't load treasury transactions", { reason: error.message }),
  });
  const names = securityNames(account);
  const series = transactions ? buildSeries(transactions, range) : undefined;
  const rangeTitle = RANGES.find((item) => item.key === range)?.title ?? "";
  const dark = environment.appearance === "dark";
  const labelColor = dark ? "#9A9CA6" : "#7B7E87";
  // Close to Raycast's own green and red in each appearance, so the chart matches the sidebar.
  const gain = dark ? "#4CC27F" : "#1F8A4C";
  const loss = dark ? "#F0605A" : "#C9352F";
  const cell = (value: string) =>
    value
      .replace(/\\/g, "\\\\")
      .replace(/\|/g, "\\|")
      .replace(/[\r\n]+/g, " ");

  const recent = (transactions ?? []).filter((t) => !describe(t, names).isValuation).slice(0, 8);
  const activity = recent
    .map((t) => {
      const row = describe(t, names);
      const day = new Date(`${t.canonicalDay.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      const amount = row.amountColor ? formatSignedCurrency(t.amount) : "";
      return `| ${day} | ${cell(row.title)} | ${amount} |`;
    })
    .join("\n");

  const returnsText = series
    ? `${series.returns >= 0 ? "↗" : "↘"} ${formatSignedCurrency(series.returns)}${series.returnsPercent !== undefined ? ` (${series.returnsPercent.toFixed(2)}%)` : ""}`
    : "";
  const markdown = series
    ? [
        `## ${formatCurrency(account.currentBalance)}`,
        `![Balance, ${rangeTitle}](${balanceChart(series.balances, {
          color: CHART_COLOR,
          labelColor,
          baseline: series.deposits,
          xLabels: series.days.map((day) => axisLabel(day, range)),
          caption: [
            { text: returnsText, color: series.returns >= 0 ? gain : loss, bold: true },
            { text: `  returns · ${rangeTitle}` },
          ],
        })})`,
        `The dashed line is what you've put in; the gap above it is your return.`,
        recent.length > 0 ? `### Recent activity\n\n| | | |\n|---|---|---:|\n${activity}` : "",
      ].join("\n\n")
    : isLoading
      ? `## ${formatCurrency(account.currentBalance)}\n\nLoading Treasury history… Mercury takes a few seconds to answer.`
      : error
        ? `## ${formatCurrency(account.currentBalance)}\n\n**Couldn't load Treasury history.** ${cell(error.message)}\n\nPress ↵ to try again.`
        : `## ${formatCurrency(account.currentBalance)}\n\nNo Treasury history yet.`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={`Treasury · ${login.name}`}
      markdown={markdown}
      metadata={
        series &&
        showingSidebar && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Balance" text={formatCurrency(account.currentBalance)} />
            <Detail.Metadata.Label
              title={`Returns · ${rangeTitle}`}
              text={{
                value: `${formatSignedCurrency(series.returns)}${series.returnsPercent !== undefined ? ` (${series.returnsPercent.toFixed(2)}%)` : ""}`,
                color: series.returns >= 0 ? Color.Green : Color.Red,
              }}
            />
            <Detail.Metadata.Label
              title="Dividends"
              text={{ value: formatCurrency(series.dividends), color: Color.Green }}
            />
            <Detail.Metadata.Label
              title="Advisory fees"
              text={{ value: formatCurrency(series.fees), color: Color.Red }}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label title="Put in, net" text={formatCurrency(series.deposits.at(-1) ?? 0)} />
            {names.size > 0 && (
              <Detail.Metadata.TagList title="Funds">
                {[...names].map(([cusip, name]) => (
                  <Detail.Metadata.TagList.Item key={cusip} text={name} />
                ))}
              </Detail.Metadata.TagList>
            )}
          </Detail.Metadata>
        )
      }
      actions={
        <ActionPanel>
          {!series && error && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={revalidate} />}
          <Action.Push
            title="View All Activity"
            icon={Icon.List}
            target={<TreasuryTransactionList login={login} account={account} />}
          />
          <ActionPanel.Submenu
            title="Change Time Range"
            icon={Icon.Calendar}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          >
            {RANGES.map((item) => (
              <Action
                key={item.key}
                title={item.title}
                icon={item.key === range ? Icon.CheckCircle : Icon.Circle}
                onAction={() => setRange(item.key)}
              />
            ))}
          </ActionPanel.Submenu>
          <Action
            title={showingSidebar ? "Hide Sidebar" : "Show Sidebar"}
            icon={Icon.AppWindowSidebarRight}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={() => setShowingSidebar((value) => !value)}
          />
          <Action.CopyToClipboard
            title="Copy Balance"
            content={formatCurrency(account.currentBalance)}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
