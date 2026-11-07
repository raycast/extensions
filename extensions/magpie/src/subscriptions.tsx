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

  useEffect(() => {
    if (quotas.error) void reportMagpieError(quotas.error);
  }, [quotas.error]);

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

  const settled = !isLoading && !quotas.isLoading;
  const accountsFailed = settled && Boolean(error) && data === undefined;
  const balancesFailed =
    settled && Boolean(quotas.error) && balances.length === 0;
  const hasAccounts = (data?.length ?? 0) > 0;
  const empty =
    settled &&
    !accountsFailed &&
    !balancesFailed &&
    !hasAccounts &&
    balances.length === 0;

  return (
    <List
      isLoading={isLoading || quotas.isLoading}
      searchBarPlaceholder="Search subscriptions"
    >
      {empty ? (
        <List.EmptyView
          title="No quotas"
          description="magpie has no subscription window or provider balance to show."
          actions={<ReloadAction onReload={reload} />}
        />
      ) : (
        <>
          {accountsFailed ? (
            <List.Section title="Subscriptions">
              <FailedRow
                title="Couldn't load subscriptions"
                message={error?.message ?? ""}
                onReload={reload}
              />
            </List.Section>
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
          {balancesFailed ? (
            <List.Section title="Key balances">
              <FailedRow
                title="Couldn't load balances"
                message={quotas.error?.message ?? ""}
                onReload={reload}
              />
            </List.Section>
          ) : balances.length > 0 ? (
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
        </>
      )}
    </List>
  );
}

function FailedRow({
  title,
  message,
  onReload,
}: {
  title: string;
  message: string;
  onReload: () => void;
}) {
  return (
    <List.Item
      icon={Icon.Warning}
      title={title}
      subtitle={message}
      actions={
        <ActionPanel>
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
