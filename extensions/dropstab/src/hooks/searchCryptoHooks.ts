import { useState, useEffect, useRef } from "react";
import fetch, { RequestInit } from "node-fetch";
import { AbortError } from "node-fetch";
import { showToast, Toast } from "@raycast/api";
import { SearchResult, SearchState } from "../types/coinType";
import { getNumberWithCommas } from "../utils/getNumberWithCommas";
import { getLargeNumberString } from "../utils/getLargeNumberString";
import { useDebounce } from "./useDebounce";

export function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: true, query: "" });
  const [searchText, setSearchText] = useState("");
  const debouncedSearchText = useDebounce(searchText, 500); // Используем useDebounce с задержкой в 500 мс
  const cancelRef = useRef<AbortController | null>(null);

  useEffect(() => {
    search(debouncedSearchText);
    return () => {
      cancelRef.current?.abort();
    };
  }, [debouncedSearchText]);

  async function search(searchText: string) {
    cancelRef.current?.abort();
    cancelRef.current = new AbortController();
    try {
      setState((oldState) => ({
        ...oldState,
        query: searchText,
        isLoading: true,
        results: [], // Очищаем результаты перед началом нового поиска
      }));
      const results = await performSearch(searchText, cancelRef.current.signal);
      setState((oldState) => ({
        ...oldState,
        results: results,
        isLoading: false,
      }));
    } catch (error) {
      if (error instanceof AbortError) {
        return;
      }
      console.error("search error", error);
      showToast(Toast.Style.Failure, "Could not perform search", String(error));
    }
  }

  async function updateCoinData(items: SearchResult[], setItems: (items: SearchResult[]) => void) {
    const ids = items.map((item) => item.id);
    const updatedItems = await performSearchById(ids, cancelRef.current!.signal);
    setItems(updatedItems);
  }

  return {
    state: state,
    search: setSearchText, // Возвращаем setSearchText для обновления searchText
    updateCoinData: updateCoinData,
  };
}

async function performSearch(searchText: string, signal: AbortSignal): Promise<SearchResult[]> {
  const params = new URLSearchParams();
  params.append("query", searchText.length === 0 ? "btc" : searchText);

  let url: string;
  let options: RequestInit;

  if (searchText.length === 0) {
    url =
      "https://api2.icodrops.com/portfolio/api/markets/mostSearched?size=6&fields=currencyId,name,symbol,slug,links,image,rank,ico,trading,price,marketCap,change&withAd=false";
    options = {
      method: "get",
      signal: signal,
    };
  } else {
    url = "https://api2.icodrops.com/portfolio/api/marketTotal/search";
    options = {
      method: "post",
      signal: signal,
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
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    type Json = Record<string, unknown>;

    const json = (await response.json()) as unknown;
    const jsonResults = searchText.length === 0 ? (json as Json[]) : ((json as { markets: Json[] })?.markets ?? []);

    return jsonResults.map((coin) => {
      const priceUSD =
        coin.price && (coin.price as Record<string, string>).USD
          ? parseFloat((coin.price as Record<string, string>).USD)
          : NaN;
      const price = !isNaN(priceUSD)
        ? priceUSD < 1
          ? `$ ${priceUSD} USD`
          : `$ ${getNumberWithCommas(Number(priceUSD.toFixed(2)))} USD`
        : "N/A";
      const marketcap =
        coin.marketCap && (coin.marketCap as Record<string, string>).USD
          ? parseFloat((coin.marketCap as Record<string, string>).USD)
          : NaN;
      const rank = coin.rank ? `# ${coin.rank}` : "N/A";
      const links = (coin.links as { type: string; link: string }[]) || [];
      const twitterLink = links.find((link) => link.type === "TWITTER")?.link || "";
      const websiteLink = links.find((link) => link.type === "WEBSITE")?.link || "";

      return {
        icon: coin.image as string,
        id: coin.currencyId as string,
        symbol: coin.symbol as string,
        price: price,
        marketCap: getLargeNumberString(marketcap),
        name: coin.name as string,
        url: "https://dropstab.com/coins/" + coin.slug,
        twitter: twitterLink,
        website: websiteLink,
        rank: rank as string, // Добавлено поле rank
      };
    });
  } catch (error) {
    if (error instanceof AbortError) {
      console.log("Request was aborted");
      return [];
    }
    throw error;
  }
}

async function performSearchById(ids: string[], signal: AbortSignal): Promise<SearchResult[]> {
  const url = "https://api.icodrops.com/portfolio/api/markets";
  const options = {
    method: "post",
    signal: signal,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      page: 0,
      size: 100,
      sort: "currencyId",
      fields: [
        "currencyId",
        "name",
        "rank",
        "symbol",
        "slug",
        "image",
        "rank",
        "ico",
        "trading",
        "price",
        "links",
        "change",
        "marketCap",
      ],
      currencyIds: ids,
      filters: {
        trading: true,
        eligibleForTop: true,
      },
      order: "ASC",
    }),
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(response.statusText);
    }

    type Json = Record<string, unknown>;

    const json = (await response.json()) as unknown;
    const jsonResults = (json as { markets: { content: Json[] } })?.markets?.content ?? [];

    return jsonResults.map((coin) => {
      const priceUSD =
        coin.price && (coin.price as Record<string, string>).USD
          ? parseFloat((coin.price as Record<string, string>).USD)
          : NaN;
      const price = !isNaN(priceUSD)
        ? priceUSD < 1
          ? `$ ${priceUSD} USD`
          : `$ ${getNumberWithCommas(Number(priceUSD.toFixed(2)))} USD`
        : "N/A";
      const marketcap =
        coin.marketCap && (coin.marketCap as Record<string, string>).USD
          ? parseFloat((coin.marketCap as Record<string, string>).USD)
          : NaN;
      const rank = coin.rank ? `# ${coin.rank}` : "N/A";
      const links = (coin.links as { type: string; link: string }[]) || [];
      const twitterLink = links.find((link) => link.type === "TWITTER")?.link || "";
      const websiteLink = links.find((link) => link.type === "WEBSITE")?.link || "";

      return {
        icon: coin.image as string,
        id: coin.currencyId as string,
        symbol: coin.symbol as string,
        price: price,
        marketCap: getLargeNumberString(marketcap),
        name: coin.name as string,
        url: "https://dropstab.com/coins/" + coin.slug,
        twitter: twitterLink,
        website: websiteLink,
        rank: rank as string, // Добавлено поле rank
      };
    });
  } catch (error) {
    if (error instanceof AbortError) {
      console.log("Request was aborted");
      return [];
    }
    throw error;
  }
}
