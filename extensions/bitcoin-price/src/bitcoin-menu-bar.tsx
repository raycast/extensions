import { MenuBarExtra, open } from "@raycast/api";
import { useMenuBar } from "./useMenuBar";

export default function Command() {
  const { isLoading, title, moreItems, coinItems } = useMenuBar();
  return (
    <MenuBarExtra isLoading={isLoading} title={title}>
      {coinItems.map((item) => (
        <MenuBarExtra.Item key={item.title} {...item} />
      ))}
      <MenuBarExtra.Section title="Bitcoin">
        {moreItems.map((item) => (
          <MenuBarExtra.Item key={item.title} {...item} />
        ))}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title="Open with...">
        <MenuBarExtra.Item title="Coinbase" onAction={() => open("https://www.coinbase.com/price/bitcoin")} />
        <MenuBarExtra.Item title="CoinDesk" onAction={() => open("https://www.coindesk.com/price/bitcoin")} />
        <MenuBarExtra.Item title="Binance" onAction={() => open("https://www.binance.com/en/trade/BTC_USDT")} />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
