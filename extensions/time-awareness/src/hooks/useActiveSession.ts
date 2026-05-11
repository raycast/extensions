import { showFailureToast, usePromise } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import { DEFAULTS, MESSAGES } from "../constants";
import { processActiveState } from "../services/active-session";
import type { SessionStats } from "../types";
import { triggerIntervalCompleteNotification } from "../utils/notifications";
import { getParsedPreferences } from "../utils/preferences";
import { resetActiveState, resetSessionTimeOnly, resetStatsOnly } from "../utils/storage";

export function useActiveSession() {
  const { activeIntervalMinutes } = getParsedPreferences();

  const {
    data: state,
    isLoading,
    revalidate,
  } = usePromise(processActiveState, [], {
    onData: async ({ shouldNotify }) => {
      if (shouldNotify) {
        await triggerIntervalCompleteNotification(activeIntervalMinutes);
      }
    },
    onError: (error) => {
      showFailureToast(error, { title: MESSAGES.ERROR.ACTIVE_STATE_CHECK });
    },
  });

  const resetSessionTime = useCallback(async () => {
    try {
      await resetSessionTimeOnly();
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: MESSAGES.ERROR.RESET_FAILED });
    }
  }, [revalidate]);

  const resetStats = useCallback(async () => {
    try {
      await resetStatsOnly();
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: MESSAGES.ERROR.RESET_FAILED });
    }
  }, [revalidate]);

  const resetAll = useCallback(async () => {
    try {
      await resetActiveState();
      revalidate();
    } catch (error) {
      showFailureToast(error, { title: MESSAGES.ERROR.RESET_FAILED });
    }
  }, [revalidate]);

  const sessionStats: SessionStats = useMemo(() => {
    const activeSeconds = state?.accumulatedActiveSeconds ?? 0;
    const sessionCount = state?.sessionCount ?? 0;
    const isIdle = state?.isIdle ?? false;
    const showAchievement = state?.achievementTimestamp
      ? Date.now() - state.achievementTimestamp <= DEFAULTS.ACHIEVEMENT_DISPLAY_DURATION_MS
      : false;

    return {
      activeSeconds,
      sessionCount,
      isIdle,
      showAchievement,
    };
  }, [state]);

  return {
    ...sessionStats,
    isLoading,
    actions: {
      refresh: revalidate,
      resetSessionTime,
      resetStats,
      resetAll,
    },
  };
}
