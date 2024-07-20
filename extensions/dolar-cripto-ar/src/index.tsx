import { useEffect, useRef, useState } from "react";
import { MenuBarExtra, showToast, Toast } from "@raycast/api";
import { useCachedState, useCachedPromise } from "@raycast/utils";
import useRates from "./hooks/useRates";
import { fetchDollarRates, fetchBtcPrice, fetchEthPrice } from "./api";

export default function Command() {
  const [selectedCurrency, setSelectedCurrency] = useCachedState<string>("selected-currency", "");
  const { dollar, crypto } = useRates();
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  const dollarAbortControllerRef = useRef<AbortController | null>(null);
  const btcAbortControllerRef = useRef<AbortController | null>(null);
  const ethAbortControllerRef = useRef<AbortController | null>(null);

  const handleError = async (error: unknown, message: string) => {
    console.error("Error details:", error);
    if (error instanceof Error) {
      if (error.name !== "AbortError") {
        await showToast({
          style: Toast.Style.Failure,
          title: message,
          message: error.message,
        });
      }
    } else {
      await showToast({
        style: Toast.Style.Failure,
        title: message,
        message: "An unknown error occurred.",
      });
    }
  };

  const fetchDollarRatesWrapper = async () => {
    if (dollarAbortControllerRef.current) {
      dollarAbortControllerRef.current.abort();
    }
    dollarAbortControllerRef.current = new AbortController();

    try {
      const result = await fetchDollarRates(dollarAbortControllerRef.current.signal);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      await handleError(error, "Failed to fetch dollar rates");
      throw error;
    }
  };

  const fetchBtcPriceWrapper = async () => {
    if (btcAbortControllerRef.current) {
      btcAbortControllerRef.current.abort();
    }
    btcAbortControllerRef.current = new AbortController();

    try {
      const result = await fetchBtcPrice(btcAbortControllerRef.current.signal);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      await handleError(error, "Failed to fetch BTC price");
      throw error;
    }
  };

  const fetchEthPriceWrapper = async () => {
    if (ethAbortControllerRef.current) {
      ethAbortControllerRef.current.abort();
    }
    ethAbortControllerRef.current = new AbortController();

    try {
      const result = await fetchEthPrice(ethAbortControllerRef.current.signal);
      return result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return null;
      }
      await handleError(error, "Failed to fetch ETH price");
      throw error;
    }
  };

  const {
    data: dollarData,
    isLoading: isDollarFetching,
    revalidate: revalidateDollar,
  } = useCachedPromise(fetchDollarRatesWrapper, [], {
    initialData: null,
    keepPreviousData: true,
  });

  const {
    data: btcData,
    isLoading: isBtcFetching,
    revalidate: revalidateBtc,
  } = useCachedPromise(fetchBtcPriceWrapper, [], {
    initialData: null,
    keepPreviousData: true,
  });

  const {
    data: ethData,
    isLoading: isEthFetching,
    revalidate: revalidateEth,
  } = useCachedPromise(fetchEthPriceWrapper, [], {
    initialData: null,
    keepPreviousData: true,
  });

  useEffect(() => {
    if (dollarData && btcData && ethData) {
      setInitialFetchDone(true);
      if (!selectedCurrency) {
        setSelectedCurrency("Blue");
      }
    }
  }, [dollarData, btcData, ethData]);

  useEffect(() => {
    const fetchData = async () => {
      if (["Blue", "MEP", "CCL"].includes(selectedCurrency)) {
        revalidateDollar();
      } else if (selectedCurrency === "BTC") {
        revalidateBtc();
      } else if (selectedCurrency === "ETH") {
        revalidateEth();
      }
    };
    fetchData();
  }, [selectedCurrency, revalidateDollar, revalidateBtc, revalidateEth]);

  useEffect(() => {
    return () => {
      if (dollarAbortControllerRef.current) {
        dollarAbortControllerRef.current.abort();
      }
      if (btcAbortControllerRef.current) {
        btcAbortControllerRef.current.abort();
      }
      if (ethAbortControllerRef.current) {
        ethAbortControllerRef.current.abort();
      }
    };
  }, []);

  const formatPrice = (price: number | undefined) => {
    return price ? `$${Math.floor(price)}` : "";
  };

  const getTitle = () => {
    if (!initialFetchDone || !selectedCurrency) {
      return "Cargando...";
    }

    if (selectedCurrency === "Blue" && dollarData?.blue?.ask !== undefined) {
      return formatPrice(dollarData.blue.ask);
    }
    if (selectedCurrency === "MEP" && dollarData?.mep?.al30["24hs"]?.price !== undefined) {
      return formatPrice(dollarData.mep.al30["24hs"].price);
    }
    if (selectedCurrency === "CCL" && dollarData?.ccl?.al30["24hs"]?.price !== undefined) {
      return formatPrice(dollarData.ccl.al30["24hs"].price);
    }
    if (selectedCurrency === "BTC" && btcData?.USD !== undefined) {
      return `${formatPrice(btcData.USD)}`;
    }
    if (selectedCurrency === "ETH" && ethData?.USD !== undefined) {
      return `${formatPrice(ethData.USD)}`;
    }
    return selectedCurrency;
  };

  return (
    <MenuBarExtra title={getTitle()} isLoading={isDollarFetching || isBtcFetching || isEthFetching}>
      <MenuBarExtra.Item title="Dólar" />
      {dollar.map((dollar) => (
        <MenuBarExtra.Item
          key={dollar.name}
          title={`${dollar.name} ${selectedCurrency === dollar.name ? "✓" : ""}`}
          onAction={() => setSelectedCurrency(dollar.name)}
        />
      ))}

      <MenuBarExtra.Item title="Criptos" />
      {crypto.map((crypto) => (
        <MenuBarExtra.Item
          key={crypto.name}
          title={`${crypto.name} ${selectedCurrency === crypto.name ? "✓" : ""}`}
          onAction={() => setSelectedCurrency(crypto.name)}
        />
      ))}
    </MenuBarExtra>
  );
}
