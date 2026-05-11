import { useState, useEffect } from "react";
import fetch, { RequestInit } from "node-fetch";
import { SearchResult, MarketDetail } from "../types/coinExchangeType";
import { getLargeNumberString } from "../utils/getLargeNumberString";
import { localStorage } from "../commands/dropstabCoinsExchangesCommands";

export const useCryptoExchangesSearch = (searchText: string) => {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (searchText.length === 0) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const searchUrl = "https://api2.icodrops.com/portfolio/api/marketTotal/search";
        const searchOptions: RequestInit = {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: searchText,
            searchItems: [
              {
                type: "markets",
                fields: [
                  "currencyId",
                  "rank",
                  "symbol",
                  "name",
                  "slug",
                  "links",
                  "image",
                  "price",
                  "marketCap",
                  "change",
                  "ico",
                  "trading",
                ],
              },
              {
                type: "exchanges",
                fields: [
                  "id",
                  "slug",
                  "image",
                  "name",
                  "type",
                  "rankVerified",
                  "rankReported",
                  "volumeVerified",
                  "volumeReported",
                  "changeReported",
                ],
              },
            ],
          }),
        };

        const searchResponse = await fetch(searchUrl, searchOptions);
        const searchData = (await searchResponse.json()) as { markets: SearchResult[] };
        const topThreeCurrencyIds = searchData.markets.slice(0, 3).map((market: SearchResult) => market.currencyId);

        const marketsUrl = "https://api.icodrops.com/portfolio/api/markets";
        const marketsOptions: RequestInit = {
          method: "post",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            page: 0,
            size: 100,
            sort: "rank",
            fields: ["currencyId", "rank", "symbol", "name", "markets"],
            currencyIds: topThreeCurrencyIds,
            filters: {
              trading: true,
              eligibleForTop: true,
            },
            order: "ASC",
          }),
        };

        const marketsResponse = await fetch(marketsUrl, marketsOptions);
        const marketsData = (await marketsResponse.json()) as { markets: { content: SearchResult[] } };

        const sortedMarkets = marketsData.markets.content.map((market: SearchResult) => {
          return {
            ...market,
            markets: market.markets
              .filter((marketDetail: MarketDetail) => marketDetail.type === "SPOT")
              .sort(
                (marketA: MarketDetail, marketB: MarketDetail) =>
                  parseFloat(marketB.volume24h) - parseFloat(marketA.volume24h),
              )
              .slice(0, 4)
              .map((marketDetail: MarketDetail) => ({
                ...marketDetail,
                volume24h: getLargeNumberString(parseFloat(marketDetail.volume24h)),
                currencyId: market.currencyId,
              })),
          };
        });

        setResults(sortedMarkets);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [searchText]);

  return { results, isLoading };
};

// Функция для обновления избранных маркетов
export const updateFavorites = async (favorites: MarketDetail[], setFavorites: (favorites: MarketDetail[]) => void) => {
  const currencyIds = Array.from(new Set(favorites.map((market) => market.currencyId)));
  if (currencyIds.length === 0) return;

  const marketsUrl = "https://api.icodrops.com/portfolio/api/markets";
  const marketsOptions: RequestInit = {
    method: "post",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page: 0,
      size: 100,
      sort: "rank",
      fields: ["currencyId", "rank", "symbol", "name", "markets"],
      currencyIds: currencyIds,
      filters: {
        trading: true,
        eligibleForTop: true,
      },
      order: "ASC",
    }),
  };

  try {
    const marketsResponse = await fetch(marketsUrl, marketsOptions);
    const marketsData = (await marketsResponse.json()) as { markets: { content: SearchResult[] } };
    const updatedFavorites: MarketDetail[] = [];

    favorites.forEach((favorite) => {
      marketsData.markets.content.find((market: SearchResult) => {
        if (market.currencyId === favorite.currencyId) {
          const updatedMarketDetail = market.markets.find(
            (marketDetail: MarketDetail) => marketDetail.id === favorite.id && marketDetail.type === "SPOT",
          );
          if (updatedMarketDetail) {
            updatedFavorites.push({
              ...favorite,
              ...updatedMarketDetail,
              volume24h: getLargeNumberString(parseFloat(updatedMarketDetail.volume24h)),
              currencyId: market.currencyId,
            });
          } else {
            updatedFavorites.push(favorite);
          }
        }
      });
    });

    setFavorites([...updatedFavorites]);
    localStorage.setItem("favorites", JSON.stringify(updatedFavorites));
  } catch (error) {
    console.error("Error updating favorites:", error);
  }
};
