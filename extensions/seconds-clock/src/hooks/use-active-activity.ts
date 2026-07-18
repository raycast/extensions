import { useCallback, useEffect, useRef, useState } from "react";

import { getActivityState, type ActivityState } from "../lib/activity";

export function useActiveActivity() {
  const [activityState, setActivityState] = useState<ActivityState>();
  const [isLoading, setIsLoading] = useState(true);
  const requestId = useRef(0);
  const isMounted = useRef(true);

  const refreshActivity = useCallback(async (nextState?: ActivityState) => {
    const currentRequestId = ++requestId.current;

    try {
      const state = nextState ?? (await getActivityState());

      if (!isMounted.current || currentRequestId !== requestId.current) {
        return;
      }

      setActivityState(state);
    } catch {
      if (isMounted.current && currentRequestId === requestId.current) {
        setActivityState(undefined);
      }
    } finally {
      if (isMounted.current && currentRequestId === requestId.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    void refreshActivity();

    return () => {
      isMounted.current = false;
    };
  }, [refreshActivity]);

  return {
    activityState,
    isLoading,
    refreshActivity,
  };
}
