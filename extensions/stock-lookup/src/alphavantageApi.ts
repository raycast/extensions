import { getPreferenceValues } from "@raycast/api";
import axios from "axios";
import { randomUUID } from "crypto";

const BASE_URL = "https://www.alphavantage.co/query?";

export interface SearchResult {
  symbol: string;
  name: string;
  region: string;
  currency: string;
}

export interface StockInfoInterface {
  open: string;
  high: string;
  low: string;
  price: string;
  volume: string;
  lastTradingDay: string;
  previousClose: string;
  change: string;
  changePercent: string;
}

export interface Preferences {
  apiKey?: string;
}

const getApiKey = () => {
  return getPreferenceValues<Preferences>().apiKey || randomUUID();
};

export async function searchStocks({ keywords }: { keywords: string }) {
  const res = await axios.get(`${BASE_URL}function=SYMBOL_SEARCH&keywords=${keywords}&apikey=${getApiKey()}`);

  if (!res.data.bestMatches) {
    throw Error("Api key Invalid");
  }

  const searchResults: SearchResult[] = [];
  res.data.bestMatches.forEach((x: Record<string, string>) => {
    searchResults.push({
      symbol: x["1. symbol"],
      name: x["2. name"],
      region: x["4. region"],
      currency: x["8. currency"],
    });
  });

  return searchResults;
}

export async function getStockInfoBySymbol(symbol: string) {
  const res = await axios.get(`${BASE_URL}function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${getApiKey()}`);

  if (!res.data["Global Quote"] || (res.data["Global Quote"] && Object.keys(res.data["Global Quote"]).length === 0)) {
    throw Error("Could not retrieve stock info");
  }

  const rawData = res.data["Global Quote"];

  const stockInfo: StockInfoInterface = {
    open: rawData["02. open"],
    high: rawData["03. high"],
    low: rawData["04. low"],
    price: rawData["05. price"],
    volume: rawData["06. volume"],
    lastTradingDay: rawData["07. latest trading day"],
    previousClose: rawData["08. previous close"],
    change: rawData["09. change"],
    changePercent: rawData["10. change percent"],
  };

  return stockInfo;
}
