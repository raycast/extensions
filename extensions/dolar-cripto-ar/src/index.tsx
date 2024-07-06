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

  const fetchDollarRatesWrapper = async () => {
    if (dollarAbortControllerRef.current) {
      dollarAbortControllerRef.current.abort();
    }
    dollarAbortControllerRef.current = new AbortController();

    try {
      return await fetchDollarRates(dollarAbortControllerRef.current.signal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== "AbortError") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch dollar rates",
            message: error.message,
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch dollar rates",
          message: "An unknown error occurred.",
        });
      }
      throw error;
    }
  };

  const fetchBtcPriceWrapper = async () => {
    if (btcAbortControllerRef.current) {
      btcAbortControllerRef.current.abort();
    }
    btcAbortControllerRef.current = new AbortController();

    try {
      return await fetchBtcPrice(btcAbortControllerRef.current.signal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== "AbortError") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch BTC price",
            message: error.message,
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch BTC price",
          message: "An unknown error occurred.",
        });
      }
      throw error;
    }
  };

  const fetchEthPriceWrapper = async () => {
    if (ethAbortControllerRef.current) {
      ethAbortControllerRef.current.abort();
    }
    ethAbortControllerRef.current = new AbortController();

    try {
      return await fetchEthPrice(ethAbortControllerRef.current.signal);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name !== "AbortError") {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to fetch ETH price",
            message: error.message,
          });
        }
      } else {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch ETH price",
          message: "An unknown error occurred.",
        });
      }
      throw error;
    }
  };

  const {
    data: dollarData,
    isLoading: isDollarFetching,
    revalidate: revalidateDollar,
  } = useCachedPromise(fetchDollarRatesWrapper, [], {
    initialData: null,
  });

  const {
    data: btcData,
    isLoading: isBtcFetching,
    revalidate: revalidateBtc,
  } = useCachedPromise(fetchBtcPriceWrapper, [], {
    initialData: null,
  });

  const {
    data: ethData,
    isLoading: isEthFetching,
    revalidate: revalidateEth,
  } = useCachedPromise(fetchEthPriceWrapper, [], {
    initialData: null,
  });

  useEffect(() => {
    if (dollarData && btcData && ethData) {
      setInitialFetchDone(true);
      if (!selectedCurrency) {
        setSelectedCurrency("Blue");
      }
    }
  }, [dollarData, btcData, ethData]);

  const blueDollarPrice = dollarData?.blue?.ask;
  const mepDollarPrice = dollarData?.mep?.al30["24hs"]?.price;
  const cclDollarPrice = dollarData?.ccl?.al30["24hs"]?.price;
  const btcPrice = btcData?.USD;
  const ethPrice = ethData?.USD;

  const formatPrice = (price: number | undefined) => {
    return price ? `$${Math.floor(price)}` : "";
  };

  const getTitle = () => {
    if (!initialFetchDone || !selectedCurrency) {
      return "Cargando...";
    }

    if (selectedCurrency === "Blue" && blueDollarPrice !== undefined) {
      return formatPrice(blueDollarPrice);
    }
    if (selectedCurrency === "MEP" && mepDollarPrice !== undefined) {
      return formatPrice(mepDollarPrice);
    }
    if (selectedCurrency === "CCL" && cclDollarPrice !== undefined) {
      return formatPrice(cclDollarPrice);
    }
    if (selectedCurrency === "BTC" && btcPrice !== undefined) {
      return `${formatPrice(btcPrice)}`;
    }
    if (selectedCurrency === "ETH" && ethPrice !== undefined) {
      return `${formatPrice(ethPrice)}`;
    }
    return selectedCurrency;
  };

  useEffect(() => {
    revalidateDollar();
    revalidateBtc();
    revalidateEth();
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
