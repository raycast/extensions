import { uniq, compact } from "lodash";
import { CoinInfo } from "#/types";

const COINS_MAP: Record<string, CoinWithName> = {
  BTC: { name: "Bitcoin" },
  ETH: { name: "Ethereum" },
  BNB: { name: "BNB" },
  SOL: { name: "Solana" },
  XRP: { name: "XRP" },
};

export function getCoinInfos(coinsText: string): CoinInfo[] {
  const rawSymbols = uniq(coinsText.split(/ +/).map((symbol) => symbol.toUpperCase()));
  let coins = compact(rawSymbols.map((symbol) => COINS_MAP[symbol] && { ...COINS_MAP[symbol], symbol }));
  if (coins.length === 0) {
    coins = Object.entries(COINS_MAP).map(([symbol, v]) => ({ ...v, symbol }));
  }
  return coins;
}

type CoinWithName = {
  name: string;
};
