import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useEffect } from "react";

import type { AccountRow } from "./lib/parse";
import { parseAccounts } from "./lib/parse";
import { reportMagpieError } from "./lib/report-error";
import { useMagpie } from "./lib/use-magpie";

export default function Subscriptions() {
  const { isLoading, data, error, revalidate } = useMagpie(
    ["accounts", "--json"],
    parseAccounts,
    20_000,
  );

  useEffect(() => {
    if (error) void reportMagpieError(error);
  }, [error]);

  const groups = new Map<string, AccountRow[]>();
  for (const account of data ?? []) {
    const list = groups.get(account.agent) ?? [];
    list.push(account);
    groups.set(account.agent, list);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search subscriptions">
      {error && !data ? (
        <List.EmptyView
          title="Couldn't load quotas"
          description={error.message}
        />
      ) : data && data.length === 0 ? (
        <List.EmptyView
          title="No subscriptions"
          description="magpie has no Claude, Codex, Copilot, or Grok sign-in to show."
        />
      ) : (
        [...groups.entries()].map(([agent, accounts]) => (
          <List.Section key={agent} title={agent}>
            {accounts.map((account, index) => (
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
                      onAction={revalidate}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ))
      )}
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
  return [account.plan, ...windows, account.error].filter(Boolean).join(" · ");
}
