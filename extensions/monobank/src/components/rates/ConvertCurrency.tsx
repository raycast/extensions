import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useState } from "react";
import { shortcuts } from "../../data/shortcuts";
import { CurrencyRate } from "../../types";
import {
  formatAmount,
  formatPlainAmount,
  getFlagImage,
  getRateConversions,
  getRateTitle,
  parseAmount,
} from "../../utils";

export default function ConvertCurrency(props: { rate: CurrencyRate }) {
  const { rate } = props;
  const [searchText, setSearchText] = useState("");

  const amount = parseAmount(searchText);
  const { currencyA, currencyB } = rate;

  return (
    <List
      navigationTitle={`Convert ${getRateTitle(rate)}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      filtering={false}
      searchBarPlaceholder="Enter amount, e.g. 200"
    >
      {amount === undefined ? (
        searchText.trim() === "" ? (
          <List.EmptyView
            icon={Icon.Coins}
            title="Enter an amount"
            description={`Type an amount to convert between ${currencyA.code} and ${currencyB.code}`}
          />
        ) : (
          <List.EmptyView
            icon={Icon.ExclamationMark}
            title="Invalid amount"
            description="Enter a positive number, e.g. 200 or 200.50"
          />
        )
      ) : (
        getRateConversions(rate).map((conversion) => {
          const { from, to, rateType } = conversion;
          const result = conversion.convert(amount);
          const formattedResult = formatAmount(result, to);

          return (
            <List.Item
              key={`${from.code}-${to.code}`}
              icon={getFlagImage(from.code)}
              title={`${formatAmount(amount, from)} → ${formattedResult}`}
              accessories={[
                {
                  text: `${rateType} ${conversion.rate}`,
                  tooltip: `1 ${currencyA.code} = ${conversion.rate} ${currencyB.code}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Result" content={formatPlainAmount(result, to)} />
                  <Action.CopyToClipboard title="Copy Amount with Currency" content={formattedResult} />
                  <Action.CopyToClipboard title="Copy Rate" content={conversion.rate} shortcut={shortcuts.copyRate} />
                </ActionPanel>
              }
            />
          );
        })
      )}
    </List>
  );
}
