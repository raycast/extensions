import { Action, ActionPanel, Icon, List, getPreferenceValues } from "@raycast/api";
import { useEffect, useState } from "react";

import { TransactionForm } from "./cryptowallet";
import { getPortfolios } from "./storage";
import { Portfolio, Preferences } from "./types";

export default function Command() {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    setPortfolios(await getPortfolios());
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <List isLoading={isLoading} navigationTitle="Add Transaction" searchBarPlaceholder="Choose a portfolio">
      <List.EmptyView title="No Portfolios" description="Create a portfolio from the CryptoWallet command first." />
      {portfolios.map((portfolio) => (
        <List.Item
          key={portfolio.id}
          icon={portfolio.emoji || Icon.Folder}
          title={portfolio.name}
          subtitle={portfolio.description}
          actions={
            <ActionPanel>
              <Action.Push
                title="Add Transaction"
                icon={Icon.Plus}
                target={<TransactionForm portfolio={portfolio} currency={baseCurrency} onSaved={load} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
