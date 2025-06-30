import { environment, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import axios, { AxiosResponse } from "axios";
import MenuItems from "./components/MenuItems";
import { CRYPTO_RATES as crypto, DOLLAR_RATES as dollar } from "./constants/currency-types";
import { DollarResponse, CryptoPriceResponse, StablePriceResponse } from "./types/types";

type AllCurrencyData = {
  dollar: DollarResponse;
  btc: CryptoPriceResponse;
  eth: CryptoPriceResponse;
  usdt: StablePriceResponse;
};

export default function Command() {
  const [selectedCurrency, setSelectedCurrency] = useCachedState<string>("selected-currency", "Blue");
  const [currencyData, setCurrencyData] = useCachedState<AllCurrencyData | null>("currency-data", null);
  const [lastFetchTime, setLastFetchTime] = useCachedState<number>("last-fetch-time", 0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);

  const fetchData = async () => {
    if (isFetching) return;

    setIsFetching(true);
    setIsLoading(true);

    try {
      const dollarResponse: AxiosResponse<DollarResponse> = await axios.get("https://criptoya.com/api/dolar");
      const btcResponse: AxiosResponse<CryptoPriceResponse> = await axios.get(
        "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD",
      );
      const ethResponse: AxiosResponse<CryptoPriceResponse> = await axios.get(
        "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",
      );
      const usdtResponse: AxiosResponse<StablePriceResponse> = await axios.get(
        "https://criptoya.com/api/binancep2p/usdt/ars/0.1",
      );

      const newCurrencyData: AllCurrencyData = {
        dollar: dollarResponse.data,
        btc: btcResponse.data,
        eth: ethResponse.data,
        usdt: usdtResponse.data,
      };

      setCurrencyData(newCurrencyData);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Failed to fetch currency data:", error);
      setCurrencyData(null);
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  const getTitle = (): string => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime;

    // Skip fetching if this is a user-initiated launch
    if (environment.launchType === LaunchType.UserInitiated) {
      if (!currencyData) {
        fetchData();
        return "Cargando...";
      }
      return formatTitle();
    }

    // If the data is outdated or missing, fetch new data
    if (!currencyData || timeSinceLastFetch > 180000) {
      fetchData();
      return "Cargando...";
    }

    return formatTitle();
  };

  const formatPrice = (price: number) => `$${Math.floor(price)}`;

  const formatTitle = (): string => {
    if (!currencyData) {
      return "Cargando...";
    }

    switch (selectedCurrency) {
      case "Oficial":
        return currencyData.dollar?.ahorro?.ask !== undefined ? formatPrice(currencyData.dollar.ahorro.ask) : "N/A";
      case "Blue":
        return currencyData.dollar?.blue?.ask !== undefined ? formatPrice(currencyData.dollar.blue.ask) : "N/A";
      case "MEP":
        return currencyData.dollar?.mep?.al30["24hs"]?.price !== undefined
          ? formatPrice(currencyData.dollar.mep.al30["24hs"].price)
          : "N/A";
      case "CCL":
        return currencyData.dollar?.ccl?.al30["24hs"]?.price !== undefined
          ? formatPrice(currencyData.dollar.ccl.al30["24hs"].price)
          : "N/A";
      case "BTC":
        return currencyData.btc?.USD !== undefined ? formatPrice(currencyData.btc.USD) : "N/A";
      case "ETH":
        return currencyData.eth?.USD !== undefined ? formatPrice(currencyData.eth.USD) : "N/A";
      case "USDT":
        return currencyData.usdt?.ask !== undefined ? formatPrice(currencyData.usdt.ask) : "N/A";
      default:
        return "N/A";
    }
  };

  const title = getTitle() as string;

  return (
    <MenuBarExtra title={title} isLoading={isLoading}>
      <MenuItems
        dollar={dollar}
        crypto={crypto}
        selectedCurrency={selectedCurrency}
        setSelectedCurrency={setSelectedCurrency}
      />
    </MenuBarExtra>
  );
}
