import { Action, ActionPanel, Color, Icon, List, open } from "@raycast/api";
import { usePromise } from "@raycast/utils";

import {
  getDebts,
  money,
  moneyFull,
  label,
  flag,
  WlthyError,
  baseUrl,
  type Debt,
} from "./lib/api";

/**
 * Debts — what you owe, sorted by USD balance. Completes the net-worth
 * picture next to Assets. Shows the native balance + currency and the
 * country the debt belongs to. Read-only.
 */
export default function Debts() {
  const { data, isLoading, error, revalidate } = usePromise(getDebts);

  if (error) {
    const message =
      error instanceof WlthyError
        ? error.message
        : "Something went wrong reading your debts.";
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Couldn't load debts"
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

  const rows: Debt[] = [...(data?.debts ?? [])].sort(
    (a, b) => b.balance_usd - a.balance_usd,
  );
  const total = rows.reduce((s, d) => s + d.balance_usd, 0);
  const nativeMatchesUsd = (d: Debt) => d.currency === "USD";

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search your debts…">
      <List.Section title={data ? `${data.count} debts` : "Debts"}>
        {rows.map((d) => (
          <List.Item
            key={d.id}
            icon={{ source: Icon.Minus, tintColor: Color.Red }}
            title={d.name}
            subtitle={
              nativeMatchesUsd(d)
                ? undefined
                : `${d.balance_native.toLocaleString()} ${d.currency}`
            }
            accessories={[
              d.country ? { text: flag(d.country) } : {},
              { tag: { value: label(d.type), color: Color.SecondaryText } },
              { text: moneyFull(d.balance_usd) },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Open Debts"
                  icon={Icon.Globe}
                  onAction={() => open(`${baseUrl()}/debts`)}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <Action.CopyToClipboard
                  title="Copy Balance"
                  content={money(d.balance_usd)}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {rows.length > 0 && (
        <List.Section title="Total">
          <List.Item
            icon={Icon.BankNote}
            title="Total debt"
            accessories={[
              { tag: { value: moneyFull(total), color: Color.Red } },
            ]}
          />
        </List.Section>
      )}
    </List>
  );
}
