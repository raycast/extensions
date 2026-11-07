import { useState, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchLenderStatus } from "../lib/noctrum-api";
import { WalletData } from "../lib/wallet";
import { LenderStatus, errorMessage } from "../lib/types";

export function useLenderStatus(wallet: WalletData | null) {
  const [data, setData] = useState<LenderStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const d = await fetchLenderStatus(wallet.address);
      setData(d);
    } catch (e) {
      console.log(e);
      showToast(Toast.Style.Failure, "Failed to load lender status", errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, refresh };
}
