/**
 * React hook for managing attendance state
 */

import { useState, useEffect, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";
import { AttendanceState, SessionExpiredError, getAttendanceStatus, toggleCheckInOut, logout } from "../utils/odoo";
import { ensureInitialized } from "../init";

interface UseAttendanceResult {
  state: AttendanceState | null;
  loading: boolean;
  error: Error | null;
  refresh: (useCache?: boolean) => Promise<void>;
  toggle: () => Promise<void>;
}

/**
 * Hook for managing attendance state with automatic refresh and error handling
 */
export function useAttendance(autoRefresh = true): UseAttendanceResult {
  ensureInitialized();

  const [state, setState] = useState<AttendanceState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async (useCache = true) => {
    try {
      setLoading(true);
      setError(null);
      const newState = await getAttendanceStatus(useCache);
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
          title: "Failed to fetch attendance",
          message: err.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const toggle = useCallback(async () => {
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Updating attendance...",
      });

      const newState = await toggleCheckInOut();
      setState(newState);

      await showToast({
        style: Toast.Style.Success,
        title: newState.attendance_state === "checked_in" ? "Checked In" : "Checked Out",
        message:
          newState.attendance_state === "checked_in"
            ? "You are now checked in"
            : `Checked out - ${newState.hours_today}h worked today`,
      });
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
          title: "Failed to update attendance",
          message: err.message,
        });
      }
    }
  }, []);

  useEffect(() => {
    refresh(true);

    if (autoRefresh) {
      // Refresh every 60 seconds
      const interval = setInterval(() => refresh(false), 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefresh]);

  return { state, loading, error, refresh, toggle };
}
