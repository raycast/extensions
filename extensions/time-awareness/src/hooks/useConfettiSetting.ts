import { showFailureToast, useCachedState, usePromise } from "@raycast/utils";
import { useCallback } from "react";
import { MESSAGES } from "../constants";
import { getConfettiEnabled, setConfettiEnabled } from "../utils/storage";

export function useConfettiSetting() {
  const [confettiEnabled, setConfettiEnabledState] = useCachedState<boolean>("confetti-enabled", true, {
    cacheNamespace: "time-awareness",
  });

  usePromise(getConfettiEnabled, [], {
    onData: setConfettiEnabledState,
  });

  const toggleConfetti = useCallback(async () => {
    const newValue = !confettiEnabled;
    setConfettiEnabledState(newValue);
    try {
      await setConfettiEnabled(newValue);
    } catch (error) {
      showFailureToast(error, { title: MESSAGES.ERROR.STORAGE_ERROR });
      setConfettiEnabledState(!newValue);
    }
  }, [confettiEnabled, setConfettiEnabledState]);

  return {
    confettiEnabled,
    toggleConfetti,
  };
}
