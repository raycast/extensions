import { useQuery } from "@tanstack/react-query";
import { fetchSolanaPrice } from "../services/solana";
import { SolanaPriceData } from "../types";

export function useSolanaPrice() {
  const {
    data: priceData = { price: 0, priceChange24h: 0 },
    isLoading,
    error,
  } = useQuery<SolanaPriceData, Error>({
    queryKey: ["solanaPrice"],
    queryFn: fetchSolanaPrice,
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
