import {
  Action,
  ActionPanel,
  Icon,
  List,
  closeMainWindow,
  showHUD,
} from "@raycast/api";
import { useEffect, useState } from "react";

import { useActiveActivity } from "./hooks/use-active-activity";
import { useNow } from "./hooks/use-now";
import {
  formatActivityDuration,
  getTimerRemainingMs,
  getTimerTitle,
  removeTimer,
  sortTimersByEnding,
  type TimerActivity,
} from "./lib/activity";

export default function Command() {
  const [hasAutoStopped, setHasAutoStopped] = useState(false);
  const now = useNow();
  const nowMs = now.getTime();
  const { activityState, isLoading, refreshActivity } = useActiveActivity();
  const timers = activityState ? sortTimersByEnding(activityState.timers) : [];

  useEffect(() => {
    if (isLoading || timers.length !== 1 || hasAutoStopped) {
      return;
    }

    setHasAutoStopped(true);
    stopTimer(timers[0]).then(() => closeMainWindow({ clearRootSearch: true }));
  }, [hasAutoStopped, isLoading, timers]);

  async function stopTimer(timer: TimerActivity) {
    const changed = await removeTimer(timer.id);
    await showHUD(
      changed ? `${getTimerTitle(timer)} Stopped` : "Timer No Longer Running",
    );
    await refreshActivity();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search timers">
      {isLoading ? null : timers.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Running Timers"
          description="There is no timer to stop."
        />
      ) : (
        timers.map((timer) => (
          <List.Item
            key={timer.id}
            title={getTimerTitle(timer)}
            subtitle={formatActivityDuration(getTimerRemainingMs(timer, nowMs))}
            icon={Icon.Clock}
            actions={
              <ActionPanel>
                <Action
                  title="Stop Timer"
                  icon={Icon.XMarkCircle}
                  onAction={() => stopTimer(timer)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
