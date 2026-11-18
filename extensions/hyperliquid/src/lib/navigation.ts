export function getHyperliquidTradeUrl(coin: string): string {
  const trimmed = coin.trim();
  // HIP-3 (builder-deployed) perps use a "<dex>:<ASSET>" symbol — keep it
  // verbatim (the lowercase dex prefix is significant; the colon is a valid path
  // char). Plain perps are uppercased to the app's canonical route form.
  const symbol = trimmed.includes(":") ? trimmed : trimmed.toUpperCase();
  return `https://app.hyperliquid.xyz/trade/${symbol}`;
}
