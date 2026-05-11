import React, { useEffect } from "react";
import { List, ActionPanel, OpenInBrowserAction, ImageMask } from "@raycast/api";
import { useFetch } from "../hooks";
import { getPrice } from "../api";
import { TAccount } from "../types";
import { round } from "../utils";

export function AccountListItem({
  hasBaseCurrencyChanged,
  account,
  setBalances,
  baseCurrency,
}: {
  hasBaseCurrencyChanged: boolean;
  account: TAccount;
  setBalances: any;
  baseCurrency: string;
}) {
  const { currency: cryptoCurrency, available } = account;
  const { data: priceData } = useFetch(
    () => getPrice({ baseCurrency, cryptoSymbol: cryptoCurrency }),
    {
      name: "prices",
      shouldShowToast: hasBaseCurrencyChanged,
    },
    [account, baseCurrency],
  );

  useEffect(() => {
    if (priceData) {
      setBalances((prevBalances: object) => {
        if (available && priceData) {
          return { ...prevBalances, [cryptoCurrency]: available * priceData.amount };
        }
        return prevBalances;
      });
    }
  }, [priceData]);

  return (
    <List.Section
      title={
        priceData
          ? `${cryptoCurrency} - ${priceData.currency} ${parseFloat(priceData.amount).toLocaleString("en-IN", {
              minimumSignificantDigits: 3,
            })}`
          : cryptoCurrency
      }
    >
      <List.Item
        icon={{
          source: `https://farisaziz12.github.io/cryptoicon-api/icons/${cryptoCurrency.toLowerCase()}.png`,
          mask: ImageMask.Circle,
        }}
        actions={
          <ActionPanel>
            <OpenInBrowserAction
              icon={{ source: "coinbase-logo.png", mask: ImageMask.Circle }}
              title="Open in Coinbase Pro"
              url={
                priceData
                  ? `https://pro.coinbase.com/trade/${cryptoCurrency}-${priceData.currency}`
                  : "https://pro.coinbase.com"
              }
            />
          </ActionPanel>
        }
        keywords={[cryptoCurrency]}
        title={`${available}`}
        subtitle={priceData ? `${priceData.currency} ${round(priceData.amount * available, 2).toLocaleString()}` : ""}
      />
    </List.Section>
  );
}
