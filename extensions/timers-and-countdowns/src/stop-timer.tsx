import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCallback, useEffect, useState } from "react";
import {
  formatHumanDuration,
  formatTimerEndTime,
  formatTimerName,
  getActiveTimers,
  removeExpiredTimers,
  removeTimer,
  stopAllTimers,
  type ActiveTimer,
} from "./timer";

function remainingLabel(timer: ActiveTimer, now: number): string {
  const remaining = timer.endAt - now;
  if (remaining <= 0) {
    return "Finished";
  }
  return `${formatHumanDuration(remaining)} left`;
}

export default function Command() {
  const [timers, setTimers] = useState<ActiveTimer[]>([]);
  const [now, setNow] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setTimers((await getActiveTimers()).slice().sort((left, right) => left.endAt - right.endAt));
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void removeExpiredTimers().then(() => refresh());
  }, [refresh]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function stop(timer: ActiveTimer) {
    const stopped = await removeTimer(timer.id);
    await refresh();
    if (!stopped) {
      await showFailureToast(new Error("It may have finished or been stopped already."), {
        title: "Timer was already gone",
      });
      return;
    }
    await showToast({
      style: Toast.Style.Success,
      title: `Stopped ${formatTimerName(stopped)}`,
    });
  }

  async function stopAll() {
    if (timers.length === 0) {
      return;
    }
    const confirmed = await confirmAlert({
      title: "Stop all timers?",
      message: `${timers.length} running ${timers.length === 1 ? "timer" : "timers"} will be canceled.`,
      primaryAction: { title: "Stop All", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) {
      return;
    }
    const count = await stopAllTimers();
    await refresh();
    await showToast({
      style: Toast.Style.Success,
      title: count === 1 ? "Stopped 1 timer" : `Stopped ${count} timers`,
    });
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search running timers">
      <List.EmptyView
        icon={Icon.Clock}
        title="No timers running"
        description="Start a timer, then come back here to stop it."
      />
      {timers.map((timer) => {
        const remaining = timer.endAt - now;
        const title = formatTimerName(timer);
        const subtitle = timer.name && timer.input !== timer.name ? timer.input : undefined;
        return (
          <List.Item
            key={timer.id}
            icon={remaining <= 0 ? Icon.CheckCircle : Icon.Clock}
            title={title}
            subtitle={subtitle}
            accessories={[
              {
                tag: {
                  value: remainingLabel(timer, now),
                  color: remaining <= 60_000 ? Color.Orange : Color.SecondaryText,
                },
              },
              { text: `ends ${formatTimerEndTime(timer.endAt)}` },
            ]}
            actions={
              <ActionPanel>
                <Action title="Stop Timer" icon={Icon.Stop} onAction={() => stop(timer)} />
                <Action
                  title="Stop All Timers"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.RemoveAll}
                  onAction={stopAll}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
