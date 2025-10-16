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
  const { compactMode } = getPreferenceValues();

  const { data, isLoading } = useFetch<Record<Currency, string>>(
    `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=${CURRENCIES.join()}`
  );
  const [shownCurrency, setShownCurrency] = useCachedState<Currency>("shown-currency", "USD");

  const title =
    data &&
    shownCurrency &&
    `${compactMode ? `Ξ` : `ETH`} ${formatCurrency(shownCurrency, Number(data[shownCurrency]), compactMode)}`;

  return (
    <MenuBarExtra isLoading={isLoading} icon={compactMode ? undefined : Icon.Coins} title={title}>
      {data &&
        Object.entries(data).map(([key, value]) => {
          const formattedValue = formatCurrency(key, Number(value));
          return (
            <MenuBarExtra.Item
              key={key}
              title={`${formattedValue} (${key})`}
              icon={flagsByCurrency[key as Currency]}
              onAction={key === shownCurrency ? undefined : () => setShownCurrency(key as Currency)}
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

const formatCurrency = (currency: string, value: number, compactMode?: boolean) => {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    notation: compactMode ? "compact" : "standard",
    currency,
    maximumFractionDigits: compactMode ? 2 : 0,
  }).format(value);
};
