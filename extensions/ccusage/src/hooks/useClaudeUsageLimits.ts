import { useState, useEffect, useCallback } from "react";
import { UsageLimitData } from "../types/usage-types";
import { subscribeToUsageLimits, getUsageLimitsState, revalidateUsageLimits } from "../utils/usage-limits-cache";

export interface UsageLimitsState {
  data: UsageLimitData | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
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
