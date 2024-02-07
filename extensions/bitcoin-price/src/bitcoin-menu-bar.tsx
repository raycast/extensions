import { MenuBarExtra, open } from "@raycast/api";
import { useMenuBar } from "./useMenuBar";

export default function Command() {
  const { isLoading, title, items } = useMenuBar();
  return (
    <MenuBarExtra isLoading={isLoading} title={title}>
      {items.map((item) => (
        <MenuBarExtra.Item key={item.title} {...item} />
      ))}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item title="Open with..." />
      <MenuBarExtra.Item title="Coinbase" onAction={() => open("https://www.coinbase.com/price/bitcoin")} />
      <MenuBarExtra.Item title="CoinDesk" onAction={() => open("https://www.coindesk.com/price/bitcoin")} />
      <MenuBarExtra.Item title="Binance" onAction={() => open("https://www.binance.com/en/trade/BTC_USDT")} />
    </MenuBarExtra>
  );
}
