import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { DownloadCodexBarAction, OpenCodexBarAction } from "./components/app-actions";
import { errorMessage, isAppMissing } from "./lib/errors";
import { formatCurrency, formatTokens } from "./lib/format";
import { loadCost } from "./lib/store";
import { DayCost, ProviderCost } from "./lib/types";

const ALL = "all";

function formatDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function tokenRows(day: DayCost): string[] {
  const rows: [string, number | undefined][] = [
    ["Input", day.inputTokens],
    ["Output", day.outputTokens],
    ["Cache read", day.cacheReadTokens],
    ["Cache write", day.cacheCreationTokens],
  ];
  return rows
    .filter(([, value]) => value !== undefined)
    .map(([label, value]) => `| ${label} | ${formatTokens(value)} |`);
}

function dayMarkdown(cost: ProviderCost, day: DayCost): string {
  const lines = [`## ${cost.name} · ${formatDay(day.date)}`, "", `# ${formatCurrency(day.cost, cost.currency)}`, ""];
  if (day.models.length > 0) {
    lines.push("| Model | Cost | Tokens |", "| --- | ---: | ---: |");
    for (const model of day.models) {
      lines.push(`| ${model.model} | ${formatCurrency(model.cost, cost.currency)} | ${formatTokens(model.tokens)} |`);
    }
    lines.push("");
  }
  const tokens = tokenRows(day);
  if (tokens.length > 0) lines.push("| Tokens | |", "| --- | ---: |", ...tokens);
  return lines.join("\n");
}

function summaryMarkdown(cost: ProviderCost): string {
  const busiest = [...cost.days].sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0))[0];
  const activeDays = cost.days.filter((day) => day.tokens > 0).length;
  return [
    `## ${cost.name} · Last 30 Days`,
    "",
    `# ${formatCurrency(cost.last30DaysCost, cost.currency)}`,
    "",
    "| | |",
    "| --- | ---: |",
    `| Today | ${formatCurrency(cost.todayCost, cost.currency)} · ${formatTokens(cost.todayTokens)} tokens |`,
    `| Tokens (30 days) | ${formatTokens(cost.last30DaysTokens)} |`,
    `| Active days | ${activeDays} |`,
    ...(activeDays > 0 && cost.last30DaysCost !== undefined
      ? [`| Average per active day | ${formatCurrency(cost.last30DaysCost / activeDays, cost.currency)} |`]
      : []),
    ...(busiest
      ? [`| Busiest day | ${formatDay(busiest.date)}, ${formatCurrency(busiest.cost, cost.currency)} |`]
      : []),
    "",
    "_Estimated at API list prices from local logs. On a subscription plan this is what the same usage would cost through the API._",
  ].join("\n");
}

export default function Command() {
  const [provider, setProvider] = useState<string>(ALL);
  const { data, isLoading, error, revalidate } = useCachedPromise(loadCost, [], {
    keepPreviousData: true,
    failureToastOptions: { title: "Could not load cost history" },
  });

  // Raycast binds the first two actions to ↵ and ⌘↵, so the shortcut is only set when Reload comes later.
  const reloadAction = (withShortcut: boolean) => (
    <Action
      title="Reload"
      icon={Icon.ArrowClockwise}
      shortcut={withShortcut ? Keyboard.Shortcut.Common.Refresh : undefined}
      onAction={revalidate}
    />
  );

  const costs = (data ?? []).filter((cost) => provider === ALL || cost.provider === provider);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={costs.length > 0}
      searchBarPlaceholder="Filter days or models"
      searchBarAccessory={
        <List.Dropdown tooltip="Provider" value={provider} onChange={setProvider}>
          <List.Dropdown.Item title="All Providers" value={ALL} />
          {(data ?? []).map((cost) => (
            <List.Dropdown.Item key={cost.provider} title={cost.name} value={cost.provider} />
          ))}
        </List.Dropdown>
      }
    >
      <List.EmptyView
        icon={isAppMissing(error) ? Icon.Warning : Icon.BarChart}
        title={
          isAppMissing(error) ? "CodexBar Is Not Installed" : error ? "Could Not Load Costs" : "No Local Usage Yet"
        }
        description={
          isAppMissing(error)
            ? "Install the CodexBar menu bar app to see your token history here."
            : error
              ? errorMessage(error)
              : "CodexBar reads cost history from local Claude Code and Codex logs. Use one of them and reload."
        }
        actions={
          <ActionPanel>
            {isAppMissing(error) ? <DownloadCodexBarAction /> : reloadAction(false)}
            <OpenCodexBarAction />
          </ActionPanel>
        }
      />
      {costs.map((cost) => (
        <List.Section key={cost.provider} title={cost.name}>
          <List.Item
            title="Last 30 Days"
            icon={Icon.BarChart}
            keywords={[cost.provider]}
            subtitle={formatCurrency(cost.last30DaysCost, cost.currency)}
            detail={<List.Item.Detail markdown={summaryMarkdown(cost)} />}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Total"
                  content={formatCurrency(cost.last30DaysCost, cost.currency)}
                />
                <OpenCodexBarAction />
                {reloadAction(true)}
              </ActionPanel>
            }
          />
          {cost.days.map((day) => (
            <List.Item
              key={`${cost.provider}-${day.date}`}
              title={formatDay(day.date)}
              icon={Icon.Calendar}
              keywords={[cost.provider, day.date, ...day.models.map((model) => model.model)]}
              subtitle={formatCurrency(day.cost, cost.currency)}
              detail={<List.Item.Detail markdown={dayMarkdown(cost, day)} />}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Cost" content={formatCurrency(day.cost, cost.currency)} />
                  <OpenCodexBarAction />
                  {reloadAction(true)}
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
