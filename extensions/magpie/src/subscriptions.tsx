import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";

import type { AccountRow } from "./lib/parse";
import { parseAccounts, parseQuotas } from "./lib/parse";
import { ReloadAction } from "./lib/reload-action";
import { reportMagpieError } from "./lib/report-error";
import { useMagpie } from "./lib/use-magpie";

export default function Subscriptions() {
  const accounts = useMagpie(["accounts", "--json"], parseAccounts, 20_000);
  const quotas = useMagpie(["quota", "--json"], parseQuotas, 20_000);
  const { isLoading, data, error, revalidate } = accounts;

  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);

  const balances = (quotas.data ?? []).filter(
    (row) => row.kind === "balance" && row.balance,
  );
  const reload = () => {
    revalidate();
    quotas.revalidate();
  };

  const groups = new Map<string, AccountRow[]>();
  for (const account of data ?? []) {
    const list = groups.get(account.agent) ?? [];
    list.push(account);
    groups.set(account.agent, list);
  }

  return (
    <List
      isLoading={isLoading || quotas.isLoading}
      searchBarPlaceholder="Search subscriptions"
    >
      {error && !data && balances.length === 0 ? (
        <List.EmptyView
          title="Couldn't load quotas"
          description={error.message}
          actions={<ReloadAction onReload={reload} />}
        />
      ) : !isLoading &&
        !quotas.isLoading &&
        (data?.length ?? 0) === 0 &&
        balances.length === 0 ? (
        <List.EmptyView
          title="No quotas"
          description="magpie has no subscription window or provider balance to show."
          actions={<ReloadAction onReload={reload} />}
        />
      ) : (
        [...groups.entries()].map(([agent, rows]) => (
          <List.Section key={agent} title={agent}>
            {rows.map((account, index) => (
              <List.Item
                key={`${account.agent}-${account.user}-${index}`}
                icon={Icon.Person}
                title={account.user || account.agent}
                subtitle={subtitle(account)}
                accessories={[
                  {
                    tag: account.active
                      ? "Signed in"
                      : account.on
                        ? "Standby"
                        : "Off",
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action
                      title="Reload"
                      icon={Icon.ArrowClockwise}
                      onAction={reload}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
      {balances.length > 0 ? (
        <List.Section title="Key balances">
          {balances.map((row) => (
            <List.Item
              key={`${row.provider}-${row.name}`}
              icon={Icon.Coins}
              title={row.name || row.provider}
              subtitle={row.balance}
              accessories={[{ tag: row.provider }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Reload"
                    icon={Icon.ArrowClockwise}
                    onAction={reload}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}

function subtitle(account: AccountRow): string {
  const windows = account.windows.map((window) => {
    const reset = window.resetsAt ? new Date(window.resetsAt) : undefined;
    const when =
      reset && !Number.isNaN(reset.getTime())
        ? `, resets ${reset.toLocaleString()}`
        : "";
    return `${window.name} ${window.used}% used${when}`;
  });
  const resets = account.resets
    ? `${account.resets.count} resets${resetWhen(account.resets.until)}`
    : undefined;
  return [account.plan, ...windows, resets, account.error]
    .filter(Boolean)
    .join(" · ");
}

function resetWhen(until?: string): string {
  if (!until) return "";
  const date = new Date(until);
  return Number.isNaN(date.getTime()) ? "" : `, until ${date.toLocaleString()}`;
}
