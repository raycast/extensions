import { showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { Coin, Collection, NFTResponse, SearchTickerResponse, Token } from "./schema";

export function useSearchTickers(token: string) {
  return useFetch<SearchTickerResponse>(`https://api.mochi.pod.town/api/v1/defi/coins?query=${token}`, {
    execute: !!token,
    onError: (error: Error) => {
      if (!token) return;
      showToast({
        style: Toast.Style.Failure,
        title: "Price Fetch Failed",
        message: "Check network connection:" + error,
      });
    },
  });
}

export function useCoin(coin: string) {
  return useFetch<{ data: Coin }>(`https://api.mochi.pod.town/api/v1/defi/coins/${coin}`, {
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Price Fetch Failed",
        message: "Check network connection:" + error,
      });
    },
  });
}

export function useNftTicker(symbol_or_address: string, query_address?: boolean) {
  return useFetch<NFTResponse>(
    `https://api.mochi.pod.town/api/v1/nfts/${symbol_or_address}/1?query_address=${query_address ?? false}`,
    {
      execute: !!symbol_or_address,
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Price Fetch Failed",
          message: "Check network connection:" + error,
        });
      },
    }
  );
}

export function useNftCollectionTicker(address: string) {
  console.log(`https://api.mochi.pod.town/api/v1/nfts/collections/tickers?collection_address=${address}&from=1&to=1683090648827`)
  return useFetch<{ data: Collection }>(
    `https://api.mochi.pod.town/api/v1/nfts/collections/tickers?collection_address=${address}&from=1&to=1683090648827`,
    {
      execute: !!address,
      onError: (error: Error) => {
        showToast({
          style: Toast.Style.Failure,
          title: "Price Fetch Failed",
          message: "Check network connection:" + error,
        });
      },
    }
  );
}

export function useGetTokenList() {
  return useFetch<{ data: Token[] }>(`https://api.mochi.pod.town/api/v1/config-defi/tokens`, {
    onError: (error: Error) => {
      showToast({
        style: Toast.Style.Failure,
        title: "Token List Fetch Failed",
        message: "Check network connection:" + error,
      });
    },
  });
}
