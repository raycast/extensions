import { LocalStorage } from "@raycast/api";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { USER_WALLET_ADDRESS_KEY } from "./constants";
import { WalletSetupForm } from "./components/WalletSetupForm";
import { BalancesView } from "./components/BalancesView";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // Consider data stale after 30 seconds
      gcTime: 300000, // Keep unused data in cache for 5 minutes
      retry: 2, // Retry failed requests twice
    },
  },
});

export default function Command() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStoredWalletAddress() {
      try {
        const storedAddress = await LocalStorage.getItem<string>(USER_WALLET_ADDRESS_KEY);
        setWalletAddress(storedAddress || null);
      } catch (error) {
        console.error("Failed to load wallet address:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStoredWalletAddress();
  }, []);

  const handleChangeWallet = async () => {
    await LocalStorage.removeItem(USER_WALLET_ADDRESS_KEY);
    setWalletAddress(null);
  };

  if (isLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <WalletSetupForm onWalletSet={setWalletAddress} />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {!walletAddress ? (
        <WalletSetupForm onWalletSet={setWalletAddress} />
      ) : (
        <BalancesView walletAddress={walletAddress} onChangeWallet={handleChangeWallet} />
      )}
    </QueryClientProvider>
  );
}
