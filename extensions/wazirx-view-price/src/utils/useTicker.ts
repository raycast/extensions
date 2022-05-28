import { useEffect, useState } from "react";
import { showToast, Toast } from "@raycast/api";
import axios, { AxiosError, AxiosResponse } from "axios";
import { BASE_URL, QUOTE_ASSET } from "./lib";

interface TickerInterface {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  openPrice: string;
  lowPrice: string;
  highPrice: string;
  lastPrice: string;
  volume: string;
  bidPrice: string;
  askPrice: string;
  at: number;
}

export default function useTicker(ticker: string | null) {
  const [tickerData, setTickerData] = useState<TickerInterface | undefined>();
  const [isLoadingTicker, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    if (ticker !== null && typeof ticker !== "undefined" && ticker.length > 2) {
      getPrice();
    }
  }, [ticker]);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch ticker",
        message: error.message,
      });
    }
  }, [error]);

  const getPrice = async () => {
    setIsLoading(true);

    await axios
      .get(`${BASE_URL}/sapi/v1/ticker/24hr?symbol=${ticker}${QUOTE_ASSET}`)
      .then((res: AxiosResponse) => {
        if (res.status === 200) {
          setTickerData(res.data);
        }
      })
      .catch((err: AxiosError) => {
        setTimeout(() => {
          setError(new Error(err.message));
        }, 500);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  return { tickerData, isLoadingTicker };
}
