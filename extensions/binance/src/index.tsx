import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { environment, preferences } from "@raycast/api";
import fs from "fs";
import path from "path";

import Binance from "node-binance-api";
const binance = new Binance().options({
  APIKEY: preferences.binance_api_key.value as string,
  APISECRET: preferences.binance_api_secret.value as string,
});

export interface PortfolioState {
  isLoading: boolean;
  portfolio: Portfolio | null;
}

interface BinanceError {
  statusMessage: string;
}

function isBinanceError(object: any): object is BinanceError {
  return "statusMessage" in object;
}

export default function BalanceList() {
  const { state } = usePortfolio();

  return (
    <List isLoading={state.isLoading} searchBarPlaceholder="Filter currencies">
      {state.portfolio
        ?.sort(compareUSDTValue)
        .reverse()
        .map((entry) => (
          <CurrencyItem key={entry.currency} portfolioEntry={entry} />
        ))}
    </List>
  );
}

function CurrencyItem(props: { portfolioEntry: PortfolioEntry }) {
  const portfolioEntry = props.portfolioEntry;
  const tradeToCurrency = portfolioEntry.tradeToCurrency;
  let tradeURL = `https://www.binance.com/`;
  if (tradeToCurrency) {
    tradeURL += `en/trade/${portfolioEntry.currency}_${tradeToCurrency}?layout=basic`;
  }
  return (
    <List.Item
      id={portfolioEntry.currency}
      key={portfolioEntry.currency}
      title={portfolioEntry.currency}
      subtitle={subtitleFor(portfolioEntry)}
      icon={portfolioEntry.icon}
      actions={
        <ActionPanel>
          <OpenInBrowserAction title="Trade on Binance.com" url={tradeURL} icon="binance-logo.png" />
        </ActionPanel>
      }
    />
  );
}

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>({ portfolio: null, isLoading: true });

  useEffect(() => {
    fetchPortfolio();
  }, []);

  async function fetchPortfolio() {
    setState((oldState) => ({
      ...oldState,
      isLoading: true,
    }));

    try {
      const balance: Balance = await binance.balance();
      const prices: PriceRecord = await binance.prices();

      const portfolio: PortfolioEntry[] = Object.keys(balance).flatMap((currency: Currency) => {
        const available = balance[currency].available;
        const usdPriceFromAPI = prices[currency.concat("USDT")];
        const tradeToCurrency = !isNaN(usdPriceFromAPI) ? "USDT" : currency == "USDT" ? null : "BTC";
        const usdPrice = !isNaN(usdPriceFromAPI) ? usdPriceFromAPI : currency == "USDT" ? 1 : 0;
        const usdValue = available * usdPrice;
        let icon = `currency/${currency.toLowerCase()}.png`;
        if (!fs.existsSync(path.join(environment.assetsPath, icon))) {
          icon = `currency/generic.png`;
        }
        return {
          currency: currency,
          available: available,
          usdPrice: usdPrice,
          usdValue: usdValue,
          tradeToCurrency: tradeToCurrency,
          icon: icon,
        } as PortfolioEntry;
      });
      setState((oldState) => ({
        ...oldState,
        isLoading: false,
        portfolio: portfolio,
      }));
    } catch (error: any) {
      let errorMsg;
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (isBinanceError(error)) {
        errorMsg = error.statusMessage;
      } else {
        errorMsg = error.toString();
      }
      showToast(ToastStyle.Failure, errorMsg);
      setState((oldState) => ({
        ...oldState,
        isLoading: false,
        portfolio: null,
      }));
    }
  }

  return { state };
}

type Currency = string;
type Price = number;
type BalanceInformation = {
  available: number;
  onOrder: number;
};
type Balance = Record<Currency, BalanceInformation>;
type PriceRecord = Record<Currency, Price>;

type PortfolioEntry = {
  currency: Currency;
  tradeToCurrency: Currency;
  available: number;
  usdPrice: number;
  usdValue: number;
  icon: string;
};
type Portfolio = PortfolioEntry[];

function subtitleFor(portfolioEntry: PortfolioEntry): string {
  if (portfolioEntry.usdPrice == 0) {
    return "";
  }

  let subtitle = `${displayNumber(portfolioEntry.usdPrice)}$`;
  if (portfolioEntry.available != 0) {
    subtitle += ` * ${displayNumber(portfolioEntry.available)} = ${displayNumber(portfolioEntry.usdValue)} $`;
  }

  return subtitle;
}

function displayNumber(number: number): string {
  return parseFloat(number.toString()).toString();
}

function compareUSDTValue(a: PortfolioEntry, b: PortfolioEntry) {
  const result = a.usdValue - b.usdValue;

  if (result == 0) {
    return b.currency.localeCompare(a.currency);
  }

  return result;
}
