/**
 * Menu bar implementation with live status and quick actions
 */

import { MenuBarExtra, Icon, launchCommand, LaunchType } from "@raycast/api";
import { useState, useEffect } from "react";
import { getAttendanceStatus, getTimerState, logout, hasActiveSession, formatHours } from "./utils/odoo";
import type { AttendanceState, TimerState } from "./utils/odoo";
import { ensureInitialized } from "./init";

interface MenuBarState {
  isLoggedIn: boolean;
  attendance: AttendanceState | null;
  timer: TimerState | null;
  loading: boolean;
}

export default function MenuBarCommand() {
  ensureInitialized();

  console.log("[MenuBar] Component rendering...");

  const [state, setState] = useState<MenuBarState>({
    isLoggedIn: false,
    attendance: null,
    timer: null,
    loading: true,
  });

  // Load initial state and set up periodic refresh
  useEffect(() => {
    loadState();

    // Check timer state every 5 seconds (only reads from cache, no API calls)
    const timerInterval = setInterval(() => {
      refreshTimer();
    }, 5 * 1000);

    return () => {
      clearInterval(timerInterval);
    };
  }, []);

  async function loadState() {
    console.log("[MenuBar] Loading state...");
    try {
      const loggedIn = await hasActiveSession();
      console.log("[MenuBar] Logged in:", loggedIn);

      if (!loggedIn) {
        console.log("[MenuBar] Not logged in, setting state");
        setState({
          isLoggedIn: false,
          attendance: null,
          timer: null,
          loading: false,
        });
        return;
      }

      console.log("[MenuBar] Fetching attendance and timer...");

      // Add timeout wrapper
      const timeout = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms));

      const [attendance, timer] = await Promise.all([
        Promise.race([getAttendanceStatus(true), timeout(5000)]).catch((err) => {
          console.error("[MenuBar] Failed to get attendance:", err.message);
          return null;
        }) as Promise<AttendanceState | null>,
        Promise.race([getTimerState(true), timeout(5000)]).catch((err) => {
          console.error("[MenuBar] Failed to get timer:", err.message);
          return null;
        }) as Promise<TimerState | null>,
      ]);

      console.log("[MenuBar] Loaded - attendance:", attendance?.attendance_state, "timer:", timer?.timerId);

      setState({
        isLoggedIn: true,
        attendance,
        timer,
        loading: false,
      });
    } catch (error) {
      console.error("[MenuBar] Failed to load menu bar state:", error);
      setState({
        isLoggedIn: false,
        attendance: null,
        timer: null,
        loading: false,
      });
    }
  }

  async function refreshTimer() {
    if (!state.isLoggedIn) return;

    try {
      // Use cache=true to instantly see changes from timesheet command
      const timer = await getTimerState(true);
      setState((prev) => ({ ...prev, timer }));
    } catch (error) {
      console.error("Failed to refresh timer:", error);
    }
  }

  async function handleLogout() {
    await logout();
    setState({
      isLoggedIn: false,
      attendance: null,
      timer: null,
      loading: false,
    });
  }

  // Determine menu bar icon
  function getMenuBarIcon(): Icon {
    if (state.loading) {
      return Icon.CircleProgress;
    }

    if (!state.isLoggedIn) {
      return Icon.Lock;
    }

    // Priority: Timer state > Attendance state
    if (state.timer?.timerId) {
      return Icon.Clock;
    }

    // Show attendance state
    if (state.attendance) {
      if (state.attendance.attendance_state === "checked_in") {
        return Icon.CircleFilled;
      } else {
        return Icon.Circle;
      }
    }

    return Icon.CircleFilled;
  }

  const icon = getMenuBarIcon();

  return (
    <MenuBarExtra icon={icon} isLoading={state.loading}>
      {!state.isLoggedIn ? (
        <>
          <MenuBarExtra.Item
            title="Login to Odoo"
            onAction={() => launchCommand({ name: "login", type: LaunchType.UserInitiated })}
            icon={Icon.Lock}
          />
        </>
      ) : (
        <>
          {/* Attendance Section */}
          <MenuBarExtra.Section title="Attendance">
            {state.attendance && (
              <MenuBarExtra.Item
                title={
                  state.attendance.attendance_state === "checked_in"
                    ? `Checked In (${formatHours(state.attendance.hours_today)})`
                    : "Checked Out"
                }
                icon={state.attendance.attendance_state === "checked_in" ? Icon.CheckCircle : Icon.XMarkCircle}
              />
            )}
            <MenuBarExtra.Item
              title="Open Attendance"
              onAction={() => launchCommand({ name: "attendance", type: LaunchType.UserInitiated })}
              icon={Icon.Eye}
            />
          </MenuBarExtra.Section>

          {/* Timesheet Section */}
          <MenuBarExtra.Section title="Timesheet">
            {state.timer?.timerId ? (
              <>
                {state.timer.projectName && (
                  <MenuBarExtra.Item
                    title={state.timer.projectName}
                    subtitle={state.timer.taskName || undefined}
                    icon={Icon.Folder}
                  />
                )}
                {state.timer.description && <MenuBarExtra.Item title={state.timer.description} icon={Icon.Pencil} />}
                <MenuBarExtra.Item
                  title="Open Timesheet"
                  onAction={() => launchCommand({ name: "timesheet", type: LaunchType.UserInitiated })}
                  icon={Icon.Eye}
                />
              </>
            ) : (
              <MenuBarExtra.Item
                title="Start Tracking"
                onAction={() => launchCommand({ name: "timesheet", type: LaunchType.UserInitiated })}
                icon={Icon.Play}
              />
            )}
          </MenuBarExtra.Section>

          {/* Settings Section */}
          <MenuBarExtra.Section>
            <MenuBarExtra.Item title="Refresh" onAction={loadState} icon={Icon.ArrowClockwise} />
            <MenuBarExtra.Item title="Logout" onAction={handleLogout} icon={Icon.Logout} />
          </MenuBarExtra.Section>
        </>
      )}
    </MenuBarExtra>
  );
}
