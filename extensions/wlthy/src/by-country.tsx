import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  getByCountry,
  money,
  moneyFull,
  flag,
  WlthyError,
  baseUrl,
  type CountryRow,
} from "./lib/api";

/**
 * By Country — where your wealth sits, with leverage per country. This is
 * wlthy's signature multi-country view: net worth broken down by the
 * country each asset and debt belongs to, so a leveraged position (assets
 * in one country, mortgage against them) reads at a glance. Read-only.
 */
export default function ByCountry() {
  const { data, isLoading, error, revalidate } = usePromise(getByCountry);

  if (error) {
    const message =
      error instanceof WlthyError
        ? error.message
        : "Something went wrong reading your country breakdown.";
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load country breakdown"
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

  const rows: CountryRow[] = [...(data?.rows ?? [])].sort(
    (a, b) => b.net_usd - a.net_usd,
  );

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter countries…">
      <List.Section title="Net worth by country">
        {rows.map((r) => {
          const leveraged = r.debts_usd > 0;
          return (
            <List.Item
              key={r.country || "unknown"}
              icon={flag(r.country)}
              title={r.country || "Unknown"}
              subtitle={
                leveraged
                  ? `${moneyFull(r.assets_usd)} assets − ${moneyFull(r.debts_usd)} debt`
                  : undefined
              }
              accessories={[
                {
                  tag: {
                    value: `${r.asset_pct.toFixed(1)}%`,
                    color: Color.Blue,
                  },
                },
                { text: moneyFull(r.net_usd) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Open Dashboard"
                    icon={Icon.Globe}
                    onAction={() => open(`${baseUrl()}/networth`)}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={revalidate}
                  />
                  <Action.CopyToClipboard
                    title="Copy Net Value"
                    content={money(r.net_usd)}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
      {data && (
        <List.Section title="Total">
          <List.Item
            icon={Icon.Globe}
            title="Net worth"
            accessories={[
              data.total_debts_usd > 0
                ? {
                    tag: {
                      value: `−${money(data.total_debts_usd)} debt`,
                      color: Color.Red,
                    },
                  }
                : {},
              {
                text: {
                  value: moneyFull(data.total_net_usd),
                  color: Color.PrimaryText,
                },
              },
            ]}
          />
        </List.Section>
      )}
    </List>
  );
}
