import { Action, ActionPanel, Detail, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";

import type { UsageReport } from "./lib/parse";
import { parseUsage } from "./lib/parse";
import { ReloadAction } from "./lib/reload-action";
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
    >
      {error && !data ? (
        <List.EmptyView
          title="Couldn't load usage"
          description={error.message}
          actions={<ReloadAction onReload={revalidate} />}
        />
      ) : data && !data.ok ? (
        <List.EmptyView
          title="Couldn't parse usage"
          description={data.raw}
          actions={<ReloadAction onReload={revalidate} />}
        />
      ) : data?.ok && data.empty ? (
        <List.EmptyView
          title="No calls in this period"
          description={data.path}
          actions={<ReloadAction onReload={revalidate} />}
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
      <List.Section
        title="Agents"
        subtitle={`${usage.tokens} tokens · ${usage.period}`}
      >
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
      {usage.extras.map((section) => (
        <List.Section key={section.title} title={sectionTitle(section.title)}>
          {section.rows.map((row) => (
            <UsageItem
              key={`${section.title}-${row.name}`}
              row={row}
              detail={detail}
              onReload={onReload}
            />
          ))}
        </List.Section>
      ))}
      {usage.sessions.length > 0 ? (
        <List.Section
          title={
            usage.sessionNote ? `Sessions · ${usage.sessionNote}` : "Sessions"
          }
        >
          {usage.sessions.map((row) => (
            <UsageItem
              key={`session-${row.name}`}
              row={row}
              detail={detail}
              onReload={onReload}
            />
          ))}
        </List.Section>
      ) : null}
    </>
  );
}

function sectionTitle(title: string): string {
  return title.replace(/(^|\s)\S/g, (chunk) => chunk.toUpperCase());
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
