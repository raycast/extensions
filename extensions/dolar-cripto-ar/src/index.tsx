import { environment, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useState } from "react";
import axios from "axios";
import MenuItems from "./components/MenuItems";
import { CRYPTO_RATES as crypto, DOLLAR_RATES as dollar } from "./constants/currency-types";
import { DollarResponse, CryptoPriceResponse, StablePriceResponse, CoinGeckoPriceResponse } from "./types/types";

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
      const [dollarResult, cryptoResult, usdtResult] = await Promise.allSettled([
        axios.get<DollarResponse>("https://criptoya.com/api/dolar"),
        axios.get<CoinGeckoPriceResponse>(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
        ),
        axios.get<StablePriceResponse>("https://criptoya.com/api/binancep2p/usdt/ars/0.1"),
      ]);

      const dollarData = dollarResult.status === "fulfilled" ? dollarResult.value.data : currencyData?.dollar;
      const cryptoData = cryptoResult.status === "fulfilled" ? cryptoResult.value.data : undefined;
      const usdtData = usdtResult.status === "fulfilled" ? usdtResult.value.data : currencyData?.usdt;

      const btc: CryptoPriceResponse =
        cryptoData?.bitcoin?.usd !== undefined ? { USD: cryptoData.bitcoin.usd } : (currencyData?.btc ?? {});
      const eth: CryptoPriceResponse =
        cryptoData?.ethereum?.usd !== undefined ? { USD: cryptoData.ethereum.usd } : (currencyData?.eth ?? {});

      // Only blank out if we have no usable data at all
      if (!dollarData && !usdtData && btc.USD === undefined && eth.USD === undefined) {
        setCurrencyData(null);
        return;
      }

      const newCurrencyData: AllCurrencyData = {
        dollar: dollarData ?? {},
        btc,
        eth,
        usdt: usdtData ?? ({} as StablePriceResponse),
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
