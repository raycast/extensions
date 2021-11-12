import React, { useEffect } from "react";
import { List, ActionPanel, OpenInBrowserAction } from "@raycast/api";
import { useFetch } from "../hooks";
import { getPrice } from "../api";
import { TAccount } from "../types";
import { round } from "../utils";

export function AccountListItem({
  account,
  setBalances,
  baseCurrency,
}: {
  account: TAccount;
  setBalances: any;
  baseCurrency: string;
}) {
  const { currency: cryptoCurrency, available } = account;
  const { data: priceData } = useFetch(
    () => getPrice({ baseCurrency, cryptoSymbol: cryptoCurrency }),
    {
      name: "prices",
      shouldShowToast: true,
    },
    [account, baseCurrency]
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
        icon={{ source: `https://cryptoicons.org/api/icon/${cryptoCurrency.toLowerCase()}/30` }}
        actions={
          <ActionPanel>
            <OpenInBrowserAction
              icon="coinbase-logo.png"
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
