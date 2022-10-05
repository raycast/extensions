import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "BRL" | "INR";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "BRL", "INR"];
const flagsByCurrency: Record<Currency, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  BRL: "🇧🇷",
  INR: "🇮🇳",
};

export default function Command() {
  const { hideIcon } = getPreferenceValues();

  const { data, isLoading } = useFetch<Record<Currency, string>>(
    `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=${CURRENCIES.join()}`
  );
  const [shownCurrency, setShownCurrency] = useCachedState<Currency>("shown-currency", "USD");

  const title = data && shownCurrency && `ETH ${formatCurrency(shownCurrency, Number(data[shownCurrency]))}`;

  return (
    <MenuBarExtra isLoading={isLoading} icon={hideIcon ? undefined : Icon.Coins} title={title}>
      {data &&
        Object.entries(data)
          .filter(([key]) => key !== shownCurrency)
          .map(([key, value]) => {
            const formattedValue = formatCurrency(key, Number(value));
            return (
              <MenuBarExtra.Item
                key={key}
                title={`${formattedValue} (${key})`}
                icon={flagsByCurrency[key as Currency]}
                onAction={() => setShownCurrency(key as Currency)}
              />
            );
          })}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open with..." />
      <MenuBarExtra.Item title="Etherscan" onAction={() => open("https://etherscan.io/chart/etherprice")} />
      <MenuBarExtra.Item title="Coinbase" onAction={() => open("https://www.coinbase.com/price/ethereum")} />
      <MenuBarExtra.Item title="CoinDesk" onAction={() => open("https://www.coindesk.com/price/ethereum/")} />
    </MenuBarExtra>
  );
}

const formatCurrency = (currency: string, value: number) => {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
  });
};
