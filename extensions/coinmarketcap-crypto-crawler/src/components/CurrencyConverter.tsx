import { Action, ActionPanel, List } from "@raycast/api";
import { useState, useMemo } from "react";

type CurrencyConverterProps = {
  coinPrice: number;
  name: string;
  symbol: string;
};

export default function CurrencyConverter({ coinPrice, name, symbol }: CurrencyConverterProps) {
  const [inputText, setInputText] = useState("");
  const inputNumber = useMemo(() => {
    if (inputText !== "") {
      return parseFloat(inputText.replace(/[$,]/g, ""));
    } else {
      return 1;
    }
  }, [inputText]);

  const usdPrice = useMemo(() => {
    if (inputNumber) {
      return inputNumber * coinPrice;
    }
  }, [inputNumber, coinPrice]);

  const currencyPrice = useMemo(() => {
    if (inputNumber && inputNumber > 0) {
      return inputNumber / coinPrice;
    }
  }, [inputNumber, coinPrice]);

  return (
    <List onSearchTextChange={(text) => setInputText(text)}>
      <List.Section title={`Convert ${name} with USD`}>
        {usdPrice && (
          <List.Item
            title={`${inputNumber} ${symbol.toUpperCase()}`}
            accessories={[{ text: `${usdPrice} USD` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={usdPrice.toString()} />
              </ActionPanel>
            }
          />
        )}

        {currencyPrice && (
          <List.Item
            title={`${inputNumber} USD`}
            accessories={[{ text: `${currencyPrice} ${symbol.toUpperCase()}` }]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={currencyPrice.toString()} />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
    </List>
  );
}
