import { useState, useEffect } from "react";
import { SearchResult, CoinData, ApiResponse } from "../types/gainersLosersType";
import fetch from "node-fetch";
import { getNumberWithCommas } from "../utils/getNumberWithCommas";
import { getLargeNumberString } from "../utils/getLargeNumberString";

export function useFetchData() {
  const [gainers, setGainers] = useState<SearchResult[]>([]);
  const [losers, setLosers] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const gainersData = await fetchGainers();
        const losersData = await fetchLosers();
        setGainers(gainersData);
        setLosers(losersData);
      } catch (error) {
        console.error("Failed to fetch data", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  async function fetchGainers(): Promise<SearchResult[]> {
    const response = await fetch("https://api2.icodrops.com/portfolio/api/markets", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [
          "currencyId",
          "rank",
          "name",
          "symbol",
          "image",
          "slug",
          "price",
          "rankChange",
          "change",
          "marketCap",
          "volume",
          "links",
        ],
        filters: { trading: true, maxRank: 300, volume: { from: 100000 } },
        sort: "change",
        order: "DESC",
        timeframe: "1D",
        quote: "USD",
        page: 0,
        size: 4,
      }),
    });

    const data = (await response.json()) as ApiResponse;
    return data.markets.content.map((coin: CoinData) => {
      const priceUSD = coin.price && coin.price.USD ? parseFloat(coin.price.USD) : NaN;
      const price = !isNaN(priceUSD)
        ? priceUSD < 1
          ? `$ ${priceUSD} USD`
          : `$ ${getNumberWithCommas(Number(priceUSD.toFixed(2)))} USD`
        : "N/A";
      const marketcapUSD = coin.marketCap && coin.marketCap.USD ? parseFloat(coin.marketCap.USD) : NaN;
      const rank = coin.rank ? `# ${coin.rank}` : "N/A";
      const change = coin.change && coin.change["1D"] ? parseFloat(coin.change["1D"].USD).toFixed(2) : "N/A";
      const links = coin.links || [];
      const twitterLink = links.find((link) => link.type === "TWITTER")?.link || "";
      const websiteLink = links.find((link) => link.type === "WEBSITE")?.link || "";

      return {
        id: coin.currencyId,
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        slug: coin.slug,
        price: price,
        marketCap: getLargeNumberString(marketcapUSD),
        rank: rank,
        change: change,
        twitter: twitterLink,
        website: websiteLink,
      };
    });
  }

  async function fetchLosers(): Promise<SearchResult[]> {
    const response = await fetch("https://api2.icodrops.com/portfolio/api/markets", {
      method: "post",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: [
          "currencyId",
          "rank",
          "name",
          "symbol",
          "image",
          "slug",
          "price",
          "rankChange",
          "change",
          "marketCap",
          "volume",
          "links",
        ],
        filters: { trading: true, maxRank: 300, volume: { from: 100000 } },
        sort: "change",
        order: "ASC",
        timeframe: "1D",
        quote: "USD",
        page: 0,
        size: 4,
      }),
    });

    const data = (await response.json()) as ApiResponse;
    return data.markets.content.map((coin: CoinData) => {
      const priceUSD = coin.price && coin.price.USD ? parseFloat(coin.price.USD) : NaN;
      const price = !isNaN(priceUSD)
        ? priceUSD < 1
          ? `$ ${priceUSD} USD`
          : `$ ${getNumberWithCommas(Number(priceUSD.toFixed(2)))} USD`
        : "N/A";
      const marketcapUSD = coin.marketCap && coin.marketCap.USD ? parseFloat(coin.marketCap.USD) : NaN;
      const rank = coin.rank ? `# ${coin.rank}` : "N/A";
      const change = coin.change && coin.change["1D"] ? parseFloat(coin.change["1D"].USD).toFixed(2) : "N/A";
      const links = coin.links || [];
      const twitterLink = links.find((link) => link.type === "TWITTER")?.link || "";
      const websiteLink = links.find((link) => link.type === "WEBSITE")?.link || "";

      return {
        id: coin.currencyId,
        name: coin.name,
        symbol: coin.symbol,
        image: coin.image,
        slug: coin.slug,
        price: price,
        marketCap: getLargeNumberString(marketcapUSD),
        rank: rank,
        change: change,
        twitter: twitterLink,
        website: websiteLink,
      };
    });
  }

  return { gainers, losers, isLoading };
}
