import { Icon, MenuBarExtra, open } from "@raycast/api";
import { useFetch } from "@raycast/utils";

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
  const { data, isLoading } = useFetch<Record<Currency, string>>(
    `https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=${CURRENCIES.join()}`
  );
  const shownCurrency: Currency = "USD";
  const title = data && `ETH ${formatCurrency(shownCurrency, Number(data[shownCurrency]))}`;

  return (
    <MenuBarExtra isLoading={isLoading} icon={Icon.Coins} title={title}>
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
                onAction={() => null}
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
