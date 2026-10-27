import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { formatUsd, modelLabel } from "./lib/models";
import { formatNumber } from "./lib/text";
import { addTotals, dayKey, emptyTotals, loadUsage, resetUsage, UsageLog, UsageTotals } from "./lib/usage";

const EIGHTHS = ["", "▏", "▎", "▍", "▌", "▋", "▊", "▉"];

/** A horizontal bar of `width` cells using eighth blocks, e.g. "███▌". */
function bar(value: number, max: number, width = 18): string {
  if (max <= 0 || value <= 0) return "";
  const eighths = Math.max(1, Math.round((value / max) * width * 8));
  return "█".repeat(Math.floor(eighths / 8)) + EIGHTHS[eighths % 8];
}

function total(log: UsageLog, include: (day: string) => boolean): UsageTotals {
  const sum = emptyTotals();
  for (const [day, models] of Object.entries(log)) {
    if (!include(day)) continue;
    for (const totals of Object.values(models)) addTotals(sum, totals);
  }
  return sum;
}

function compact(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(n);
}

function tokens(t: UsageTotals): number {
  return t.input + t.output + t.cacheRead + t.cacheWrite;
}

function accessories(t: UsageTotals): List.Item.Accessory[] {
  return [
    { text: t.requests === 1 ? "1 request" : `${formatNumber(t.requests)} requests` },
    {
      text: `${compact(tokens(t))} tokens`,
      tooltip: `Input ${formatNumber(t.input)} · Output ${formatNumber(t.output)} · Cache ${formatNumber(t.cacheRead + t.cacheWrite)}`,
    },
    { tag: { value: formatUsd(t.cost), color: t.cost > 0 ? Color.Green : Color.SecondaryText } },
  ];
}

export default function Command() {
  const { data: log = {}, isLoading, revalidate } = usePromise(loadUsage);
  const today = dayKey();
  const weekStart = dayKey(new Date(Date.now() - 6 * 86_400_000));
  const month = today.slice(0, 7);

  const periods = [
    { title: "Today", icon: Icon.Sun, totals: total(log, (d) => d === today) },
    { title: "Last 7 Days", icon: Icon.Calendar, totals: total(log, (d) => d >= weekStart) },
    { title: "This Month", icon: Icon.Calendar, totals: total(log, (d) => d.startsWith(month)) },
    { title: "All Time", icon: Icon.BarChart, totals: total(log, () => true) },
  ];

  const byModel = new Map<string, UsageTotals>();
  for (const [day, models] of Object.entries(log)) {
    if (!day.startsWith(month)) continue;
    for (const [model, totals] of Object.entries(models)) {
      let sum = byModel.get(model);
      if (!sum) byModel.set(model, (sum = emptyTotals()));
      addTotals(sum, totals);
    }
  }
  const models = [...byModel.entries()].sort((a, b) => b[1].cost - a[1].cost);
  const maxModelCost = Math.max(0, ...models.map(([, t]) => t.cost));

  const days = Array.from({ length: 14 }, (_, i) => dayKey(new Date(Date.now() - i * 86_400_000))).map((day) => ({
    day,
    totals: total(log, (d) => d === day),
  }));
  const maxDayCost = Math.max(0, ...days.map((d) => d.totals.cost));

  const actions = (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={revalidate}
      />
      <Action.OpenInBrowser title="Open Claude Console" url="https://console.anthropic.com" />
      <Action
        title="Reset Counters"
        icon={Icon.Trash}
        style={Action.Style.Destructive}
        onAction={async () => {
          const ok = await confirmAlert({
            title: "Reset Usage Counters?",
            message: "Only this extension's local counters are deleted.",
            primaryAction: { title: "Reset", style: Alert.ActionStyle.Destructive },
          });
          if (!ok) return;
          await resetUsage();
          revalidate();
        }}
      />
    </ActionPanel>
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Estimated costs · your actual bill is in the Claude Console">
      <List.Section title="Summary">
        {periods.map((p) => (
          <List.Item
            key={p.title}
            icon={p.icon}
            title={p.title}
            accessories={accessories(p.totals)}
            actions={actions}
          />
        ))}
      </List.Section>
      {models.length > 0 && (
        <List.Section title="This Month by Model">
          {models.map(([model, t]) => (
            <List.Item
              key={model}
              icon={Icon.ComputerChip}
              title={modelLabel(model)}
              subtitle={bar(t.cost, maxModelCost, 12)}
              accessories={[
                ...(t.webSearches ? [{ text: t.webSearches === 1 ? "1 search" : `${t.webSearches} searches` }] : []),
                ...accessories(t),
              ]}
              actions={actions}
            />
          ))}
        </List.Section>
      )}
      <List.Section title="Last 14 Days">
        {days.map(({ day, totals }) => (
          <List.Item
            key={day}
            icon={day === today ? Icon.Dot : Icon.Circle}
            title={new Date(`${day}T12:00:00`).toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
              weekday: "short",
            })}
            subtitle={bar(totals.cost, maxDayCost)}
            accessories={totals.requests ? accessories(totals) : [{ text: "—" }]}
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  );
}
