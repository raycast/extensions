/**
 * Unified timesheet command - checks for running timer and shows appropriate UI
 */

import { Detail, ActionPanel, Action, showToast, Toast, launchCommand, LaunchType } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { TaskSelector } from "./components/TaskSelector";
import { useTimesheet } from "./hooks/useTimesheet";
import {
  startTimerWithDetails,
  getServerTime,
  cancelTimer,
  hasActiveSession,
  formatDuration,
  getElapsedSeconds,
} from "./utils/odoo";

export default function TimesheetCommand() {
  const { state, loading, error, refresh, stop } = useTimesheet(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const serverTimeOffsetRef = useRef<number>(0);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Update elapsed time every second when timer is running
  useEffect(() => {
    if (state?.startTime) {
      const syncWithServer = async () => {
        try {
          // Fetch server time to calculate offset
          const serverTime = await getServerTime();
          const serverDate = new Date(serverTime.replace(" ", "T"));
          const localDate = new Date();
          serverTimeOffsetRef.current = serverDate.getTime() - localDate.getTime();

          const elapsed = getElapsedSeconds(state.startTime!, serverTime);
          setElapsedSeconds(elapsed);
        } catch (error) {
          console.error("[Timesheet UI] Failed to get server time:", error);
        }
      };

      const updateElapsed = () => {
        if (state.startTime) {
          // Calculate elapsed using local time + server offset
          const startDate = new Date(state.startTime.replace(" ", "T"));
          const now = new Date(Date.now() + serverTimeOffsetRef.current);
          const elapsed = Math.floor((now.getTime() - startDate.getTime()) / 1000);
          setElapsedSeconds(elapsed);
        }
      };

      // Initial sync with server
      syncWithServer();

      // Update display every second
      const displayInterval = setInterval(updateElapsed, 1000);

      // Sync with server every 30 seconds to prevent drift
      const syncInterval = setInterval(syncWithServer, 30 * 1000);

      return () => {
        clearInterval(displayInterval);
        clearInterval(syncInterval);
      };
    }
  }, [state?.startTime]);

  async function checkAuth() {
    const isLoggedIn = await hasActiveSession();
    if (!isLoggedIn) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Not Logged In",
        message: "Please login first",
      });
      await launchCommand({ name: "login", type: LaunchType.UserInitiated });
    }
  }

  async function handleStartTimer(projectId: number, taskId: number, description: string) {
    setIsSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Starting timer...",
      });

      // Start the timer with project, task, and description in one operation
      await startTimerWithDetails(projectId, taskId, description || undefined);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Started",
        message: "Tracking time to project and task",
      });

      // Refresh state to show timer running view
      await refresh(false);
    } catch (error) {
      console.error("Failed to start timer:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStopTimer() {
    if (!state?.timerId || !state?.projectId || !state?.taskId) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Timer Incomplete",
        message: "Please assign project and task first",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Stopping timer...",
      });

      const result = await stop(state.timerId);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Stopped",
        message: `Logged ${formatDuration(result.duration)}`,
      });

      // Refresh state to show start form
      await refresh(false);
    } catch (error) {
      console.error("Failed to stop timer:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCancelTimer() {
    if (!state?.timerId) {
      return;
    }

    setIsSubmitting(true);
    try {
      await showToast({
        style: Toast.Style.Animated,
        title: "Canceling timer...",
      });

      await cancelTimer(state.timerId);

      await showToast({
        style: Toast.Style.Success,
        title: "Timer Canceled",
        message: "Timer deleted without saving",
      });

      // Refresh state to show start form
      await refresh(false);
    } catch (error) {
      console.error("Failed to cancel timer:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to cancel timer",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Error state
  if (error) {
    return (
      <Detail
        markdown={`# Error\n\n${error.message}`}
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={() => refresh(false)} />
          </ActionPanel>
        }
      />
    );
  }

  // Loading state
  if (loading && !state) {
    return <Detail isLoading={true} markdown="# Checking timer status..." />;
  }

  // Timer running state
  if (state?.timerId) {
    const hasProjectAndTask = state.projectId && state.taskId;
    const markdown = `# ⏱ Timer Running

## Elapsed Time
${formatDuration(elapsedSeconds)}

## Project
${state.projectName || "_Not assigned_"}

## Task
${state.taskName || "_Not assigned_"}

## Description
${state.description || "_No description_"}

${!hasProjectAndTask ? "\n⚠️ **Warning:** Project or task not assigned. Please edit the timer before stopping." : ""}`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            {hasProjectAndTask && !isSubmitting && <Action title="Stop Timer" onAction={handleStopTimer} />}
            {!isSubmitting && (
              <Action title="Cancel Timer" onAction={handleCancelTimer} shortcut={{ modifiers: ["cmd"], key: "d" }} />
            )}
            <Action title="Refresh" onAction={() => refresh(false)} shortcut={{ modifiers: ["cmd"], key: "r" }} />
          </ActionPanel>
        }
      />
    );
  }

  // No timer running - show start form
  return <TaskSelector onSubmit={handleStartTimer} />;
}
