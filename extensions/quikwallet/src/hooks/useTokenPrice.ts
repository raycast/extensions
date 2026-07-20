import { useQuery } from "@tanstack/react-query";

interface TokenPriceData {
  price: number;
  priceChange24h: number;
}

const COINGECKO_IDS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "usd-coin", // USDC
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "jito-staked-sol", // JitoSOL
  "6AJcP7wuLwmRYLBNbi825wgguaPsWzPBEHcHndpRpump": "vine", // Vine Coin
  "2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv": "pudgy-penguins", // Pudgy Penguins
};

async function fetchTokenPrice(mintAddress: string): Promise<TokenPriceData> {
  const coingeckoId = COINGECKO_IDS[mintAddress];
  if (!coingeckoId) {
    return { price: 0, priceChange24h: 0 };
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true`,
    );

    if (!response.ok) {
      console.error(`CoinGecko API error for ${coingeckoId}: ${response.status} ${response.statusText}`);
      return { price: 0, priceChange24h: 0 };
    }

    const data = await response.json();

    // Check if the token data exists in the response
    if (!data[coingeckoId]) {
      console.warn(`No price data available for token ${mintAddress} (${coingeckoId})`);
      return { price: 0, priceChange24h: 0 };
    }

    const price = data[coingeckoId].usd;
    const priceChange = data[coingeckoId].usd_24h_change;

    if (typeof price !== "number" || isNaN(price)) {
      console.warn(`Invalid price data for ${coingeckoId}:`, data[coingeckoId]);
      return { price: 0, priceChange24h: 0 };
    }

    return {
      price: price || 0,
      priceChange24h: typeof priceChange === "number" ? priceChange : 0,
    };
  } catch (error) {
    console.error(`Failed to fetch price for token ${mintAddress}:`, error);
    return { price: 0, priceChange24h: 0 };
  }
}

export function useTokenPrice(mintAddress: string) {
  const {
    data: priceData = { price: 0, priceChange24h: 0 },
    isLoading,
    error,
  } = useQuery<TokenPriceData, Error>({
    queryKey: ["tokenPrice", mintAddress],
    queryFn: () => fetchTokenPrice(mintAddress),
    enabled: !!mintAddress && !!COINGECKO_IDS[mintAddress],
    refetchInterval: 10000, // Refetch every 10 seconds
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    staleTime: 5000, // Consider data stale after 5 seconds
    gcTime: 300000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  return {
    price: priceData.price,
    priceChange24h: priceData.priceChange24h,
    isLoading,
    error: error ? error.message : null,
  };
}
