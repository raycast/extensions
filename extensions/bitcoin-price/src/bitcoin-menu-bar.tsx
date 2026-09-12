import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useCachedState, useFetch } from "@raycast/utils";

type Currency = "USD" | "EUR" | "GBP" | "JPY" | "BRL";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "JPY", "BRL"];
const flagsByCurrency: Record<Currency, string> = {
  USD: "🇺🇸",
  EUR: "🇪🇺",
  GBP: "🇬🇧",
  JPY: "🇯🇵",
  BRL: "🇧🇷",
};

export default function Command() {
  const { hideIcon } = getPreferenceValues();

  const { data, isLoading } = useFetch<Record<Currency, string>>(
    `https://min-api.cryptocompare.com/data/price?fsym=BTC&tsyms=${CURRENCIES.join()}`
  );
  const [shownCurrency, setShownCurrency] = useCachedState<Currency>("shown-currency", "USD");

  const title = data && shownCurrency && `BTC ${formatCurrency(shownCurrency, Number(data[shownCurrency]))}`;

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
      <MenuBarExtra.Item title="Coinbase" onAction={() => open("https://www.coinbase.com/price/bitcoin")} />
      <MenuBarExtra.Item title="CoinDesk" onAction={() => open("https://www.coindesk.com/price/bitcoin/")} />
    </MenuBarExtra>
  );
}

const formatCurrency = (currency: string, value: number) => {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency,
  });
};
