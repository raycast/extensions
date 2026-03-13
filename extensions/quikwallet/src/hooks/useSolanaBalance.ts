import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchSolanaBalance } from "../services/solana";
import { UseSolanaBalanceReturn } from "../types";

export function useSolanaBalance(walletAddress: string): UseSolanaBalanceReturn {
  const queryClient = useQueryClient();

  const {
    data: balance,
    isLoading,
    error,
    refetch: queryRefetch,
  } = useQuery<number, Error>({
    queryKey: ["solanaBalance", walletAddress],
    queryFn: () => fetchSolanaBalance(walletAddress),
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

  const refetch = async () => {
    // Optimistically update the cache
    const previousData = queryClient.getQueryData<number>(["solanaBalance", walletAddress]);
    if (previousData !== undefined) {
      queryClient.setQueryData(["solanaBalance", walletAddress], previousData);
    }
    await queryRefetch();
  };

  return {
    balance: balance ?? null,
    isLoading,
    error: error ? error.message : null,
    refetch,
  };
}
