import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import {
  FocusTimerInfo,
  getIslandStatus,
  sendSocketCommand,
  startDaemonIfNotRunning,
} from "./lib/ipc";

export default function FocusTimer() {
  const [timer, setTimer] = useState<FocusTimerInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchTimer = async () => {
    try {
      const status = await getIslandStatus();
      if (status) {
        setTimer(status.timer);
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTimer();
    const interval = setInterval(fetchTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStartPreset = async (seconds: number, title: string) => {
    try {
      await startDaemonIfNotRunning();
      await sendSocketCommand({
        action: "timer_start",
        seconds,
        title,
      });
      await sendSocketCommand({
        action: "expand",
        widget: "timer",
        duration: 3.5,
      });
      await fetchTimer();
      await showToast({
        style: Toast.Style.Success,
        title: `Started ${title} (${Math.floor(seconds / 60)}m)`,
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to start timer",
        message: err instanceof Error ? err.message : "Daemon error",
      });
    }
  };

  const handleToggleTimer = async () => {
    try {
      await sendSocketCommand({ action: "timer_toggle" });
      await fetchTimer();
      await showToast({
        style: Toast.Style.Success,
        title: timer?.isRunning ? "Timer Paused" : "Timer Resumed",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to toggle timer",
      });
    }
  };

  const handleResetTimer = async () => {
    try {
      await sendSocketCommand({ action: "timer_reset" });
      await fetchTimer();
      await showToast({ style: Toast.Style.Success, title: "Timer Reset" });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to reset timer",
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search focus timer presets..."
    >
      {timer && (
        <List.Section title="Current Active Session">
          <List.Item
            icon={{
              source: timer.isRunning ? Icon.Play : Icon.Pause,
              tintColor: timer.isRunning ? Color.Orange : Color.SecondaryText,
            }}
            title={`${timer.title}: ${formatSeconds(timer.remainingSeconds)}`}
            subtitle={timer.isRunning ? "Running on Dynamic Island" : "Paused"}
            accessories={[
              {
                text: `${Math.round(timer.progress * 100)}% complete`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title={timer.isRunning ? "Pause Timer" : "Resume Timer"}
                  icon={timer.isRunning ? Icon.Pause : Icon.Play}
                  onAction={handleToggleTimer}
                />
                <Action
                  title="Reset Timer"
                  icon={Icon.RotateAntiClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={handleResetTimer}
                />
                <Action
                  title="Show on Notch Island"
                  icon={Icon.Eye}
                  onAction={async () => {
                    await sendSocketCommand({
                      action: "expand",
                      widget: "timer",
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      <List.Section title="Start Focus Session">
        <List.Item
          icon={{ source: Icon.Clock, tintColor: Color.Orange }}
          title="Pomodoro (25 Minutes)"
          subtitle="Standard deep focus work interval"
          accessories={[{ text: "25:00" }]}
          actions={
            <ActionPanel>
              <Action
                title="Start 25m Pomodoro"
                icon={Icon.Play}
                onAction={() => handleStartPreset(25 * 60, "Pomodoro")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.Clock, tintColor: Color.Red }}
          title="Deep Work (50 Minutes)"
          subtitle="Extended focus session for complex coding tasks"
          accessories={[{ text: "50:00" }]}
          actions={
            <ActionPanel>
              <Action
                title="Start 50m Deep Work"
                icon={Icon.Play}
                onAction={() => handleStartPreset(50 * 60, "Deep Work")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.MugSteam, tintColor: Color.Green }}
          title="Short Break (5 Minutes)"
          subtitle="Quick recharge break"
          accessories={[{ text: "05:00" }]}
          actions={
            <ActionPanel>
              <Action
                title="Start 5m Break"
                icon={Icon.Play}
                onAction={() => handleStartPreset(5 * 60, "Short Break")}
              />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: Icon.MugSteam, tintColor: Color.Blue }}
          title="Long Break (15 Minutes)"
          subtitle="Relax and walk away from screen"
          accessories={[{ text: "15:00" }]}
          actions={
            <ActionPanel>
              <Action
                title="Start 15m Long Break"
                icon={Icon.Play}
                onAction={() => handleStartPreset(15 * 60, "Long Break")}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
