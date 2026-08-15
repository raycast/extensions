import { Action, ActionPanel, List } from "@raycast/api";
import { useState, useMemo } from "react";

type CurrencyConverterProps = {
  coinPrice: number;
  name: string;
  symbol: string;
};
import BigNumber from "bignumber.js";

export default function CurrencyConverter({ coinPrice, name, symbol }: CurrencyConverterProps) {
  const [inputText, setInputText] = useState("");

  const inputNumber = useMemo(() => {
    if (inputText !== "") {
      return new BigNumber(inputText.replace(/[$,]/g, ""));
    } else {
      return new BigNumber(1);
    }
  }, [inputText]);

  const usdPrice = useMemo(() => {
    if (!inputNumber.isNaN()) {
      return inputNumber.multipliedBy(coinPrice).toFixed(2);
    }
  }, [inputNumber, coinPrice]);

  const currencyPrice = useMemo(() => {
    if (!inputNumber.isNaN() && inputNumber.gt(0)) {
      return inputNumber.dividedBy(coinPrice).toFixed(8);
    }
  }, [inputNumber, coinPrice]);

  return (
    <List onSearchTextChange={(text) => setInputText(text)}>
      <List.Section title={`Convert ${name} with USD`}>
        {usdPrice && (
          <List.Item
            title={`${inputNumber.toString()} ${symbol.toUpperCase()}`}
            accessories={[{ text: `${usdPrice} USD` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={usdPrice} />
              </ActionPanel>
            }
          />
        )}

        {currencyPrice && (
          <List.Item
            title={`${inputNumber.toString()} USD`}
            accessories={[{ text: `${currencyPrice} ${symbol.toUpperCase()}` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={currencyPrice} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
