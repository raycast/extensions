/**
 * All currencies view component.
 */

import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import type { useBunqSession } from "../../hooks/useBunqSession";
import { TOP_CURRENCIES, sortCurrencies, type CurrencyInfo } from "./wise-helpers";
import { QuoteCalculator } from "./QuoteCalculator";

interface AllCurrenciesViewProps {
  currencies: CurrencyInfo[];
  session: ReturnType<typeof useBunqSession>;
}

export function AllCurrenciesView({ currencies, session }: AllCurrenciesViewProps) {
  const { push } = useNavigation();
  const sortedCurrencies = sortCurrencies(currencies);

  return (
    <List navigationTitle="All Currencies" searchBarPlaceholder="Search currencies...">
      <List.Section title="Major Currencies">
        {sortedCurrencies
          .filter((c) => TOP_CURRENCIES.includes(c.currency))
          .map((currency) => (
            <List.Item
              key={currency.currency}
              title={currency.currency}
              subtitle={currency.name ?? ""}
              icon={{ source: Icon.Coins, tintColor: Color.Green }}
              actions={
                <ActionPanel>
                  <Action
                    title="Get Quote"
                    icon={Icon.Calculator}
                    onAction={() =>
                      push(
                        <QuoteCalculator session={session} currencies={currencies} defaultTarget={currency.currency} />,
                      )
                    }
                  />
                  <Action.CopyToClipboard title="Copy Currency Code" content={currency.currency} />
                  {currency.name && <Action.CopyToClipboard title="Copy Currency Name" content={currency.name} />}
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
      <List.Section title="All Other Currencies">
        {sortedCurrencies
          .filter((c) => !TOP_CURRENCIES.includes(c.currency))
          .map((currency) => (
            <List.Item
              key={currency.currency}
              title={currency.currency}
              subtitle={currency.name ?? ""}
              icon={{ source: Icon.Coins, tintColor: Color.SecondaryText }}
              actions={
                <ActionPanel>
                  <Action
                    title="Get Quote"
                    icon={Icon.Calculator}
                    onAction={() =>
                      push(
                        <QuoteCalculator session={session} currencies={currencies} defaultTarget={currency.currency} />,
                      )
                    }
                  />
                  <Action.CopyToClipboard title="Copy Currency Code" content={currency.currency} />
                  {currency.name && <Action.CopyToClipboard title="Copy Currency Name" content={currency.name} />}
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
