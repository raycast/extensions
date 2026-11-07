import { useEffect, useState, useCallback } from "react";
import { getStoredWallet, WalletData } from "../lib/wallet";

export function useWallet() {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const w = await getStoredWallet();
    setWallet(w);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { wallet, isLoading, refresh };
}
