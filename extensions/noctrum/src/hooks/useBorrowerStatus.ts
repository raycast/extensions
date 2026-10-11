import { useState, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchBorrowerStatus } from "../lib/noctrum-api";
import { WalletData } from "../lib/wallet";
import { BorrowerStatus, errorMessage } from "../lib/types";

export function useBorrowerStatus(wallet: WalletData | null) {
  const [data, setData] = useState<BorrowerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const d = await fetchBorrowerStatus(wallet.address);
      setData(d);
    } catch (e) {
      console.log(e);
      showToast(Toast.Style.Failure, "Failed to load borrower status", errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, refresh };
}
