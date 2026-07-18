import { ActionPanel, Action, Icon, List } from "@raycast/api";

import { useActiveActivity } from "./hooks/use-active-activity";
import { useNow } from "./hooks/use-now";
import {
  formatActivityDuration,
  getStopwatchElapsedMs,
  stopStopwatch,
} from "./lib/activity";

export default function Command() {
  const now = useNow();
  const { activityState, isLoading, refreshActivity } = useActiveActivity();
  const stopwatch = activityState?.stopwatch;

  const handleStop = async () => {
    await stopStopwatch();
    await refreshActivity();
  };

  return (
    <List isLoading={isLoading} navigationTitle="Stopwatch">
      {!isLoading && stopwatch ? (
        <List.Item
          title={formatActivityDuration(
            getStopwatchElapsedMs(stopwatch, now.getTime()),
          )}
          subtitle="Running"
          icon={Icon.Stopwatch}
          actions={
            <ActionPanel>
              <Action
                title="Stop Stopwatch"
                icon={Icon.Stopwatch}
                onAction={handleStop}
              />
            </ActionPanel>
          }
        />
      ) : !isLoading ? (
        <List.EmptyView
          icon={Icon.Stopwatch}
          title="No Stopwatch Running"
          description="Run Start Stopwatch to begin counting."
        />
      ) : null}
    </List>
  );
}
