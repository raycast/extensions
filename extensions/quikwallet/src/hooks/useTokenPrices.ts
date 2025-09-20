import { useMemo } from "react";
import { useTokenPrice } from "./useTokenPrice";

const KNOWN_TOKENS = {
  USDC: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  JITOSOL: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
  VINE: "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump",
  PUDGY: "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv",
} as const;

export function useTokenPrices(tokenBalances: Array<{ mintAddress: string }>) {
  const usdcPrice = useTokenPrice(KNOWN_TOKENS.USDC);
  const jitoSolPrice = useTokenPrice(KNOWN_TOKENS.JITOSOL);
  const vinePrice = useTokenPrice(KNOWN_TOKENS.VINE);
  const pudgyPrice = useTokenPrice(KNOWN_TOKENS.PUDGY);

  const tokenPrices = useMemo(() => {
    const prices: Record<string, { price: number; priceChange24h: number; isLoading: boolean }> = {};

    tokenBalances.forEach((token) => {
      switch (token.mintAddress) {
        case KNOWN_TOKENS.USDC:
          prices[token.mintAddress] = usdcPrice;
          break;
        case KNOWN_TOKENS.JITOSOL:
          prices[token.mintAddress] = jitoSolPrice;
          break;
        case KNOWN_TOKENS.VINE:
          prices[token.mintAddress] = vinePrice;
          break;
        case KNOWN_TOKENS.PUDGY:
          prices[token.mintAddress] = pudgyPrice;
          break;
        default:
          prices[token.mintAddress] = { price: 0, priceChange24h: 0, isLoading: false };
      }
    });

    return prices;
  }, [tokenBalances, usdcPrice, jitoSolPrice, vinePrice, pudgyPrice]);

  const isLoading = usdcPrice.isLoading || jitoSolPrice.isLoading || vinePrice.isLoading || pudgyPrice.isLoading;

  return { tokenPrices, isLoading };
}
