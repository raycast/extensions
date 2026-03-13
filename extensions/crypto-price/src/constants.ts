export const COINS: Record<string, CoinWithName> = {
  BTC: { name: "Bitcoin" },
  ETH: { name: "Ethereum" },
  BNB: { name: "BNB" },
  SOL: { name: "Solana" },
  XRP: { name: "XRP" },
};

type CoinWithName = {
  name: string;
};
