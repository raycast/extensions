import { useState, useEffect, useCallback } from "react";
import { UsageLimitData } from "../types/usage-types";
import { subscribeToUsageLimits, getUsageLimitsState, revalidateUsageLimits } from "../utils/usage-limits-cache";
import { UsageLimitsError } from "../utils/usage-limits-error";

interface UsageLimitsState {
  data: UsageLimitData | null;
  error: UsageLimitsError | null;
  isLoading: boolean;
  isStale: boolean;
  isUsageLimitsAvailable: boolean;
  lastFetched: Date | null;
  revalidate: () => void;
}

export const useClaudeUsageLimits = (): UsageLimitsState => {
  const [state, setState] = useState(getUsageLimitsState());

  useEffect(() => {
    const unsubscribe = subscribeToUsageLimits(setState);
    return unsubscribe;
  }, []);

  const revalidate = useCallback(() => {
    revalidateUsageLimits();
  }, []);

  return {
    ...state,
    revalidate,
  };
};
