import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import type { UsageReport } from "./lib/parse";
import { parseUsage } from "./lib/parse";
import { reportMagpieError } from "./lib/report-error";
import { useMagpie } from "./lib/use-magpie";

const PERIODS = [
  { title: "Today", value: "today" },
  { title: "Last 7 Days", value: "7d" },
  { title: "Last 30 Days", value: "30d" },
  { title: "All Time", value: "all" },
] as const;

export default function Usage() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["value"]>("7d");
  const { isLoading, data, error, revalidate } = useMagpie(
    ["usage", period],
    parseUsage,
  );

  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);

  const dropdown = (
    <List.Dropdown
      tooltip="Period"
      value={period}
      onChange={(value) => setPeriod(value as typeof period)}
    >
      {PERIODS.map((item) => (
        <List.Dropdown.Item
          key={item.value}
          title={item.title}
          value={item.value}
        />
      ))}
    </List.Dropdown>
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search usage"
      searchBarAccessory={dropdown}
      navigationTitle={
        data?.ok && !data.empty
          ? `${data.tokens} tokens · ${data.period}`
          : "Usage"
      }
    >
      {error && !data ? (
        <List.EmptyView
          title="Couldn't load usage"
          description={error.message}
        />
      ) : data && !data.ok ? (
        <List.EmptyView
          title="Couldn't parse usage"
          description={data.raw}
          actions={<Reload actions={revalidate} />}
        />
      ) : data?.ok && data.empty ? (
        <List.EmptyView
          title="No calls in this period"
          description={data.path}
        />
      ) : data?.ok ? (
        <UsageSections usage={data} onReload={revalidate} />
      ) : null}
    </List>
  );
}

function UsageSections({
  usage,
  onReload,
}: {
  usage: Extract<UsageReport, { ok: true; empty: false }>;
  onReload: () => void;
}) {
  const detail = ["```", usage.breakdown, usage.path ?? "", "```"]
    .filter(Boolean)
    .join("\n");
  return (
    <>
      <List.Section title="Agents">
        {usage.agents.map((row) => (
          <UsageItem
            key={`agent-${row.name}`}
            row={row}
            detail={detail}
            onReload={onReload}
          />
        ))}
      </List.Section>
      <List.Section title="Models">
        {usage.models.map((row) => (
          <UsageItem
            key={`model-${row.name}`}
            row={row}
            detail={detail}
            onReload={onReload}
          />
        ))}
      </List.Section>
    </>
  );
}

function UsageItem({
  row,
  detail,
  onReload,
}: {
  row: {
    name: string;
    share: string;
    tokens: string;
    calls: string;
    price: string;
  };
  detail: string;
  onReload: () => void;
}) {
  return (
    <List.Item
      icon={Icon.BarChart}
      title={row.name}
      subtitle={`${row.calls} ${row.calls === "1" ? "call" : "calls"} · ${row.price}`}
      accessories={[{ text: row.tokens }, { text: row.share }]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Breakdown"
            icon={Icon.Text}
            target={<Detail markdown={detail} />}
          />
          <Action
            title="Reload"
            icon={Icon.ArrowClockwise}
            onAction={onReload}
          />
        </ActionPanel>
      }
    />
  );
}

function Reload({ actions }: { actions: () => void }) {
  return (
    <ActionPanel>
      <Action title="Reload" icon={Icon.ArrowClockwise} onAction={actions} />
    </ActionPanel>
  );
}
