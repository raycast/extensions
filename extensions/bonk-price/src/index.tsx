import { getPreferenceValues, Icon, MenuBarExtra, open } from "@raycast/api";
import { useFetch, getFavicon } from "@raycast/utils";

interface Response {
  bonk: {
    usd: number;
  };
}

export default function Command() {
  const { bonkAmount } = getPreferenceValues();

  const { isLoading, data, revalidate } = useFetch<Response>(
    `https://api.coingecko.com/api/v3/simple/price?ids=bonk&vs_currencies=usd`
  );

  const title = data ? `$${(Number(bonkAmount.replace(/,/g, "")) * data.bonk.usd).toFixed(2)}` : "Loading...";

  return (
    <MenuBarExtra title={title} isLoading={isLoading}>
      <MenuBarExtra.Item title={`${bonkAmount} BONK`} />
      <MenuBarExtra.Item
        title="Solscan"
        icon={getFavicon("https://solscan.io")}
        onAction={() => open("https://solscan.io/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263")}
      />
      <MenuBarExtra.Item
        title="Solana Explorer"
        icon={getFavicon("https://explorer.solana.com")}
        onAction={() =>
          open("https://explorer.solana.com/address/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263?cluster=devnet")
        }
      />
      <MenuBarExtra.Item
        title="Swap On Jupiter"
        icon={getFavicon("https://jup.ag/swap/Bonk-USDC")}
        onAction={() => open("https://jup.ag/swap/Bonk-USDC")}
      />
      <MenuBarExtra.Item title="Refresh" onAction={revalidate} icon={Icon.RotateAntiClockwise} />
    </MenuBarExtra>
  );
}
