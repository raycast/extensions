import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";

import {
  getAllocation,
  type AllocationDimension,
  money,
  label,
  WlthyError,
  baseUrl,
} from "./lib/api";

/**
 * Allocation — a List with a dropdown to switch dimension (class / currency
 * / geography / sector). Each row is one bucket with its share and USD
 * value; an inline bar makes the split glanceable. Read-only.
 */
const DIMENSIONS: { id: AllocationDimension; name: string }[] = [
  { id: "class", name: "Asset class" },
  { id: "currency", name: "Currency" },
  { id: "geography", name: "Geography" },
  { id: "sector", name: "Sector" },
];

/** A tiny 10-cell text bar so a row shows its weight at a glance. */
function bar(pct: number): string {
  const filled = Math.max(0, Math.min(10, Math.round(pct / 10)));
  return "█".repeat(filled) + "░".repeat(10 - filled);
}

export default function Allocation() {
  const [by, setBy] = useState<AllocationDimension>("class");
  const { data, isLoading, error, revalidate } = usePromise(getAllocation, [
    by,
  ]);

  const dropdown = (
    <List.Dropdown
      tooltip="Break down by"
      value={by}
      onChange={(v) => setBy(v as AllocationDimension)}
    >
      {DIMENSIONS.map((d) => (
        <List.Dropdown.Item key={d.id} title={d.name} value={d.id} />
      ))}
    </List.Dropdown>
  );

  if (error) {
    const message =
      error instanceof WlthyError
        ? error.message
        : "Something went wrong reading your allocation.";
    return (
      <List searchBarAccessory={dropdown}>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load allocation"
          description={message}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action.OpenInBrowser
                title="Open Settings"
                url={`${baseUrl()}/settings?tab=api`}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={dropdown}
      searchBarPlaceholder="Filter buckets…"
    >
      {data?.rows.map((row) => (
        <List.Item
          key={row.category}
          title={label(row.category)}
          subtitle={bar(row.pct)}
          accessories={[
            {
              text: `${row.pct.toFixed(1)}%`,
              icon: { source: Icon.CircleProgress100, tintColor: Color.Blue },
            },
            { tag: money(row.value_usd) },
          ]}
          actions={
            <ActionPanel>
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                onAction={revalidate}
              />
              <Action
                title="Open Reports"
                icon={Icon.Globe}
                onAction={() => open(`${baseUrl()}/reports`)}
              />
            </ActionPanel>
          }
        />
      ))}
      {data && (
        <List.Item
          title="Total"
          icon={Icon.BankNote}
          accessories={[
            { tag: { value: money(data.total_usd), color: Color.PrimaryText } },
          ]}
        />
      )}
    </List>
  );
}
