/**
 * React hook for managing timesheet tracking state
 */

import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import {
  TimerState,
  SessionExpiredError,
  startTimer,
  updateTimer,
  stopTimer,
  getRunningTimer,
  logout,
} from "../utils/odoo";
import { ensureInitialized } from "../init";

interface UseTimesheetResult {
  state: TimerState | null;
  loading: boolean;
  error: Error | null;
  refresh: (useCache?: boolean) => Promise<void>;
  start: () => Promise<{ timerId: number; startTime: string }>;
  update: (timerId: number, projectId?: number, taskId?: number, description?: string) => Promise<void>;
  stop: (timerId: number) => Promise<{ duration: number }>;
}

/**
 * Hook for managing timesheet tracking with automatic refresh and error handling
 */
export function useTimesheet(autoRefresh = true): UseTimesheetResult {
  ensureInitialized();

  const [state, setState] = useState<TimerState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);
      const newState = await getRunningTimer(useCache);
      setState(newState);
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        await logout();
        await showToast({
          style: Toast.Style.Failure,
          title: "Session Expired",
          message: "Please login again",
        });
        setError(err);
      } else if (err instanceof Error) {
        setError(err);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch timer state",
          message: err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const start = useCallback(async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer...",
      });

      const result = await startTimer();

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: "Now select project and task",
      });

      // Refresh state
      await refresh(false);

      return result;
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Not Logged In",
          message: "Please login first",
        });
      } else if (err instanceof Error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to start timer",
          message: err.message,
        });
      }
      throw err;
    }
  }, [refresh]);

  const update = useCallback(
    async (timerId: number, projectId?: number, taskId?: number, description?: string) => {
      try {
        await updateTimer(timerId, projectId, taskId, description);

        // Refresh state
        await refresh(false);
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          await logout();
          await showToast({
            style: Toast.Style.Failure,
            title: "Session Expired",
            message: "Please login again",
          });
        } else if (err instanceof Error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to update timer",
            message: err.message,
          });
        }
        throw err;
      }
    },
    [refresh],
  );

  const stop = useCallback(
    async (timerId: number) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Stopping timer...",
        });

        const result = await stopTimer(timerId);

        await showToast({
          style: Toast.Style.Success,
          title: "Timer Stopped",
          message: `Logged ${Math.round(result.duration / 60)} minutes`,
        });

        // Refresh state
        await refresh(false);

        return result;
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          await logout();
          await showToast({
            style: Toast.Style.Failure,
            title: "Session Expired",
            message: "Please login again",
          });
        } else if (err instanceof Error) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Failed to stop timer",
            message: err.message,
          });
        }
        throw err;
      }
    },
    [refresh],
  );

  useEffect(() => {
    refresh(true);

    if (autoRefresh && state?.timerId) {
      // Refresh every 30 seconds when timer is active
      const interval = setInterval(() => refresh(false), 30 * 1000);
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefresh, state?.timerId]);

  return { state, loading, error, refresh, start, update, stop };
}
