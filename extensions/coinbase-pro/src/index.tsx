import React, { useState } from "react";
import { List, ActionPanel } from "@raycast/api";
import { getAccounts } from "./api";
import { useFetch } from "./hooks";
import { TAccount } from "./types";
import { AccountListItem } from "./components";
import { round } from "./utils";

export default function App() {
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const accounts = useFetch(getAccounts, {
    name: "accounts",
    defaultValue: [],
    shouldShowToast: true,
    refreshInterval: 10_000,
  });

  const total = Object.values(balances).reduce((a, b) => a + b, 0);
  return (
    <List isLoading={accounts.length === 0} searchBarPlaceholder="Filter accounts by name...">
      <List.Section title="Total Balance">
        <List.Item
          actions={
            <ActionPanel title="Currencies">
              <ActionPanel.Item title="View EUR" onAction={() => setBaseCurrency("EUR")} />
              <ActionPanel.Item title="View GBP" onAction={() => setBaseCurrency("GBP")} />
              <ActionPanel.Item title="View USD" onAction={() => setBaseCurrency("USD")} />
            </ActionPanel>
          }
          keywords={accounts.map(({ currency }: { currency: string }) => currency)}
          title={`${baseCurrency} ${round(total, 2).toLocaleString("en-IN", {
            minimumSignificantDigits: 3,
          })}`}
        />
      </List.Section>
      {accounts.map((account: TAccount) => (
        <AccountListItem baseCurrency={baseCurrency} key={account.id} account={account} setBalances={setBalances} />
      ))}
    </List>
  );
}
