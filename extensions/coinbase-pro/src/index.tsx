import React, { useState } from "react";
import { List, ActionPanel, Icon } from "@raycast/api";
import { getAccounts } from "./api";
import { useFetch, usePreviousState } from "./hooks";
import { TAccount } from "./types";
import { AccountListItem } from "./components";
import { round } from "./utils";

export default function App() {
  const [balances, setBalances] = useState<{ [key: string]: number }>({});
  const [baseCurrency, setBaseCurrency] = useState<string>("USD");
  const { data: accounts, isLoading } = useFetch(getAccounts, {
    name: "accounts",
    defaultValue: [],
    shouldShowToast: true,
  });
  const prevBaseCurrency = usePreviousState(baseCurrency);

  const renderTotalBalance = () => {
    if (isLoading) return null;
    if (!accounts[0]) return <List.Item icon={Icon.XmarkCircle} title="No Results" />;

    const total = Object.values(balances).reduce((a, b) => a + b, 0);
    return (
      <List.Section title="Total Balance">
        <List.Item
          actions={
            <ActionPanel title="Currencies">
              <ActionPanel.Item title="View in EUR" onAction={() => setBaseCurrency("EUR")} />
              <ActionPanel.Item title="View in GBP" onAction={() => setBaseCurrency("GBP")} />
              <ActionPanel.Item title="View in USD" onAction={() => setBaseCurrency("USD")} />
            </ActionPanel>
          }
          keywords={accounts.map(({ currency }: { currency: string }) => currency)}
          title={`${baseCurrency} ${round(total, 2).toLocaleString("en-IN", {
            minimumSignificantDigits: 3,
          })}`}
        />
      </List.Section>
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter accounts by name...">
      {renderTotalBalance()}
      {accounts.map((account: TAccount) => (
        <AccountListItem
          hasBaseCurrencyChanged={prevBaseCurrency && prevBaseCurrency !== baseCurrency}
          baseCurrency={baseCurrency}
          key={account.id}
          account={account}
          setBalances={setBalances}
        />
      ))}
    </List>
  );
}
