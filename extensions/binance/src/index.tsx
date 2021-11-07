import { ActionPanel, List, OpenInBrowserAction, showToast, ToastStyle } from "@raycast/api";
import { useState, useEffect } from "react";
import { environment, preferences } from "@raycast/api";
import fs from 'fs';
import path from 'path'

import Binance from 'node-binance-api';
const binance = new Binance().options({
  APIKEY: preferences.binance_api_key.value as string,
  APISECRET: preferences.binance_api_secret.value as string
});

export default function BalanceList() {
  const [state, setState] = useState<{ portfolio: Portfolio }>( { portfolio: [] } );

  useEffect(() => {
    async function fetch() {
      const portfolio = await fetchPortfolio()
      setState((oldState) => ({
        ...oldState,
        portfolio: portfolio
      }));
    }
    fetch();
  }, []);

  return (
    <List isLoading={state.portfolio.length == 0} searchBarPlaceholder="Filter currencies">
    {
      state.portfolio
      .sort(compareUSDTValue)
      .reverse()
      .map((entry) => (
          <CurrencyItem key={entry.currency} portfolioEntry={entry} />
      ))
    }
    </List>
  );
}

function CurrencyItem(props: { portfolioEntry: PortfolioEntry }) {
  const portfolioEntry = props.portfolioEntry;
  const tradeToCurrency = portfolioEntry.tradeToCurrency
  let tradeURL = `https://www.binance.com/`
  if (tradeToCurrency) {
    tradeURL += `en/trade/${portfolioEntry.currency}_${tradeToCurrency}?layout=basic`
  }
  return (
    <List.Item
      id={portfolioEntry.currency}
      key={portfolioEntry.currency}
      title={portfolioEntry.currency}
      subtitle={subtitleFor(portfolioEntry) }
      icon={portfolioEntry.icon}
      actions={
          <ActionPanel>
            <OpenInBrowserAction title="Trade on Binance.com" url={tradeURL} icon="binance-logo.png" />
          </ActionPanel>
      }
    />
  );
}

async function fetchPortfolio(): Promise<Portfolio> {
  try {
    const balance = await binance.balance() as Balance
    const prices = await binance.prices() as PriceRecord

    const portfolio: PortfolioEntry[] = Object.keys(balance).flatMap((currency: Currency) => {
      const available = balance[currency].available
      const usdPriceFromAPI = prices[currency.concat('USDT')]
      const tradeToCurrency = !isNaN(usdPriceFromAPI) ? 'USDT' : (currency == 'USDT') ? null : 'BTC'
      const usdPrice = !isNaN(usdPriceFromAPI) ? usdPriceFromAPI : (currency == 'USDT') ? 1 : 0
      const usdValue = available * usdPrice
      let icon = `currency/${currency.toLowerCase()}.png`  
      if (!fs.existsSync(path.join(environment.assetsPath, icon))) {
        icon = `currency/generic.png`
      }
      return { 
        currency: currency, 
        available: available,
        usdPrice: usdPrice,
        usdValue: usdValue,
        tradeToCurrency: tradeToCurrency,
        icon: icon
      } as PortfolioEntry
    })
    return Promise.resolve(portfolio)
  } catch (error) {
    const binanceError = error as BinanceError
    console.error(binanceError)
    showToast(ToastStyle.Failure, `Loading failed`)
    return Promise.resolve([])
  }
}

type BinanceError = { statusMessage: string }
type Currency = string
type Price = number
type BalanceInformation = {
  available: number;
  onOrder: number;
}
type Balance = Record<Currency, BalanceInformation>
type PriceRecord = Record<Currency, Price>

type PortfolioEntry = {
  currency: Currency,
  tradeToCurrency: Currency,
  available: number,
  usdPrice: number,
  usdValue: number,
  icon: string
}
type Portfolio = PortfolioEntry[]

function subtitleFor(portfolioEntry: PortfolioEntry): string {
  if (portfolioEntry.usdPrice == 0) {
    return ""
  }

  let subtitle = `${displayNumber(portfolioEntry.usdPrice)}$`
  if (portfolioEntry.available != 0) {
    subtitle += ` * ${displayNumber(portfolioEntry.available)} = ${displayNumber(portfolioEntry.usdValue)} $`
  }

  return subtitle
}

function displayNumber(number: number): string {
  return parseFloat(number.toString()).toString()
}

function compareUSDTValue( a: PortfolioEntry, b: PortfolioEntry ) {
  const result = a.usdValue - b.usdValue

  if (result == 0) {
    return b.currency.localeCompare(a.currency)
  }

  return result
}
