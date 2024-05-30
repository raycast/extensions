import { useEffect, useState } from "react";
import { MenuBarExtra } from "@raycast/api";
import { LocalStorage } from "@raycast/api";
import { useFetch } from "@raycast/utils";

type Dollar = { name: string };

type DollarResponse = {
  blue: { ask: number };
  mep: { al30: { "48hs": { price: number } } };
  ccl: { al30: { "48hs": { price: number } } };
};

const useRates = () => {
  const [state, setState] = useState<{ dollar: Dollar[]; crypto: Dollar[]; isLoading: boolean }>({
    dollar: [],
    crypto: [],
    isLoading: true,
  });

  useEffect(() => {
    setState({
      dollar: [{ name: "Blue" }, { name: "MEP" }, { name: "CCL" }],
      crypto: [{ name: "BTC" }, { name: "ETH" }],
      isLoading: false,
    });
  }, []);

  return state;
};

export default function Command() {
  const [selectedCurrency, setSelectedCurrency] = useState<string | undefined>();
  const { dollar, crypto } = useRates();

  const { data, isLoading: isFetching } = useFetch<DollarResponse>("https://criptoya.com/api/dolar");
  const { data: btcData, isLoading: isBtcFetching } = useFetch<{ USD: number }>(
    "https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=USD",
  );
  const { data: ethData, isLoading: isEthFetching } = useFetch<{ USD: number }>(
    "https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD",
  );

  useEffect(() => {
    const fetchInitialCurrency = async () => {
      const memoryCurrency = await LocalStorage.getItem<string>("selected-currency");
      setSelectedCurrency(memoryCurrency || "Blue");
    };
    fetchInitialCurrency();
  }, []);

  useEffect(() => {
    const updateCurrencyInMemory = async () => {
      if (selectedCurrency) {
        await LocalStorage.setItem("selected-currency", selectedCurrency);
      }
    };
    updateCurrencyInMemory();
  }, [selectedCurrency]);

  const blueDollarPrice = data?.blue?.ask;
  const mepDollarPrice = data?.mep?.al30["48hs"]?.price;
  const cclDollarPrice = data?.ccl?.al30["48hs"]?.price;
  const btcPrice = btcData?.USD;
  const ethPrice = ethData?.USD;

  const formatPrice = (price: number | undefined) => {
    return price ? `$${Math.floor(price)}` : "";
  };

  const getTitle = () => {
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

  return (
    <MenuBarExtra title={getTitle()} isLoading={isFetching || isBtcFetching || isEthFetching}>
      <MenuBarExtra.Item title="Dólar" />
      {dollar.map((dollar) => (
        <MenuBarExtra.Item key={dollar.name} title={dollar.name} onAction={() => setSelectedCurrency(dollar.name)} />
      ))}

      <MenuBarExtra.Item title="Criptos" />
      {crypto.map((crypto) => (
        <MenuBarExtra.Item key={crypto.name} title={crypto.name} onAction={() => setSelectedCurrency(crypto.name)} />
      ))}
    </MenuBarExtra>
  );
}
