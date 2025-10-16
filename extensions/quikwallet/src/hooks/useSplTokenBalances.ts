import { useQuery } from "@tanstack/react-query";
import { fetchSplTokenBalances } from "../services/solana";
import { SplTokenBalance, UseSplTokenBalancesReturn } from "../types";

export function useSplTokenBalances(walletAddress: string): UseSplTokenBalancesReturn {
  const {
    data: tokenBalances = [],
    isLoading,
    error,
  } = useQuery<SplTokenBalance[], Error>({
    queryKey: ["splTokenBalances", walletAddress],
    queryFn: () => fetchSplTokenBalances(walletAddress),
    enabled: !!walletAddress,
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
    tokenBalances,
    isLoading,
    error: error ? error.message : null,
  };
}
