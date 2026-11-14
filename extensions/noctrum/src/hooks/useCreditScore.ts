import { useState, useCallback, useEffect } from "react";
import { showToast, Toast } from "@raycast/api";
import { fetchCreditScore } from "../lib/noctrum-api";
import { WalletData } from "../lib/wallet";
import { errorMessage } from "../lib/types";

export interface CreditScoreData {
  tier: string;
  loansRepaid: number;
  loansDefaulted: number;
  collateralMultiplier: number;
  ethPrice: number;
}

export function useCreditScore(wallet: WalletData | null) {
  const [score, setScore] = useState<CreditScoreData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!wallet) return;
    setIsLoading(true);
    try {
      const data = await fetchCreditScore(wallet.address);
      setScore(data);
    } catch (e) {
      console.log(e);
      showToast(Toast.Style.Failure, "Failed to load credit score", errorMessage(e));
    } finally {
      setIsLoading(false);
    }
  }, [wallet]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { score, isLoading, refresh };
}
