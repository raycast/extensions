import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import EditTimer from "./edit-timer";
import { isAuthenticated, makeAuthenticatedRequest } from "./lib/auth";
import StartTimer from "./start-timer";
import { Timer } from "./types";

export default function Timers() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTimers = useCallback(async () => {
    try {
      const response = await makeAuthenticatedRequest("/timers");

      if (response.ok) {
        const data = await response.json();
        setTimers((data as Timer[]) || []);
      } else if (response.status === 401) {
        setIsAuth(false);
        await showToast({
          style: Toast.Style.Failure,
          title: "Authentication Error",
          message: "Please check your credentials in Preferences",
        });
      } else {
        throw new Error("Failed to load timers");
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: error instanceof Error ? error.message : "Failed to load timers",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    const authenticated = await isAuthenticated();
    setIsAuth(authenticated);

    if (authenticated) {
      await loadTimers();
    } else {
      setIsLoading(false);
    }
  }, [loadTimers]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  async function stopTimer(timer: Timer) {
    try {
      const response = await makeAuthenticatedRequest(`/timers/${timer.id}`, {
        method: "PUT",
        body: JSON.stringify({
          is_active: false,
          end_time: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        await loadTimers();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Timer stopped",
        });
      } else {
        throw new Error("Failed to stop timer");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to stop timer",
      });
    }
  }

  async function deleteTimer(timer: Timer) {
    try {
      const response = await makeAuthenticatedRequest(`/timers/${timer.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadTimers();
        await showToast({
          style: Toast.Style.Success,
          title: "Success",
          message: "Timer deleted",
        });
      } else {
        throw new Error("Failed to delete timer");
      }
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to delete timer",
      });
    }
  }

  function formatDuration(startTime?: string | null, endTime?: string | null): string {
    if (!startTime) return "Not started";

    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diff = end.getTime() - start.getTime();

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  if (isAuth === false) {
    return (
      <Detail
        markdown={"Please set your Braintick email and password in Raycast Preferences."}
        actions={
          <ActionPanel>
            <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={() => openExtensionPreferences()} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List isLoading={isLoading}>
      {timers.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Timers"
          description="Start tracking your time"
          actions={
            <ActionPanel>
              <Action.Push title="Start Timer" icon={Icon.Play} target={<StartTimer onTimerStarted={loadTimers} />} />
            </ActionPanel>
          }
        />
      ) : (
        timers.map((timer) => (
          <List.Item
            key={timer.id}
            icon={timer.is_active ? Icon.Clock : Icon.CheckCircle}
            title={timer.description || timer.task?.title || timer.project?.name || "Timer"}
            subtitle={timer.project?.name}
            accessories={
              [
                timer.is_active && {
                  icon: Icon.Dot,
                  tooltip: "Active",
                  tag: { value: "Active", color: Color.Green },
                },
                {
                  text: formatDuration(timer.start_time, timer.end_time),
                  icon: Icon.Hourglass,
                },
                timer.is_billable && {
                  icon: Icon.Coins,
                  tooltip: "Billable",
                },
              ].filter(Boolean) as List.Item.Accessory[]
            }
            actions={
              <ActionPanel>
                {timer.is_active ? (
                  <Action title="Stop Timer" icon={Icon.Stop} onAction={() => stopTimer(timer)} />
                ) : (
                  <Action.Push
                    title="Start New Timer"
                    icon={Icon.Play}
                    target={<StartTimer onTimerStarted={loadTimers} />}
                  />
                )}
                <Action.Push
                  title="Edit Timer"
                  icon={Icon.Pencil}
                  target={<EditTimer timer={timer} onTimerUpdated={loadTimers} />}
                  shortcut={{ modifiers: ["cmd"], key: "e" }}
                />
                <Action
                  title="Delete Timer"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => deleteTimer(timer)}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
