import { Color, Icon, MenuBarExtra } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { readCachedStatus, writeCachedStatus } from "./status-cache";
import { ensureTrackingState, fetchTrackingStatus } from "./taxmaro";
import {
  currentRunSeconds,
  formatDuration,
  optimisticallySetRunning,
  todaySeconds,
  type TrackingStatus,
} from "./tracking-status";

const Command = () => {
  const [isMutating, setIsMutating] = useState(false);
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(fetchTrackingStatus, [], {
    initialData: readCachedStatus(),
    onError: (fetchError) => console.error(fetchError),
  });

  const toggle = async (status: TrackingStatus) => {
    if (isMutating) return;

    const desiredRunning = !status.running;
    const previous = status;
    setIsMutating(true);

    try {
      await mutate(ensureTrackingState(desiredRunning), {
        optimisticUpdate: (current) => {
          const optimistic = optimisticallySetRunning(current, desiredRunning);
          writeCachedStatus(optimistic);
          return optimistic;
        },
        rollbackOnError: true,
        shouldRevalidateAfter: true,
      });
    } catch (mutationError) {
      writeCachedStatus(previous);
      await showFailureToast(mutationError, {
        title: desiredRunning ? "Couldn’t Start Tracking" : "Couldn’t Stop Tracking",
      });
    } finally {
      setIsMutating(false);
    }
  };

  if (!data) {
    return (
      <MenuBarExtra icon={{ source: Icon.Stopwatch, tintColor: Color.SecondaryText }} isLoading={isLoading}>
        <MenuBarExtra.Item
          title={error ? "Couldn’t Load Taxmaro" : "Loading Taxmaro…"}
          icon={error ? Icon.ExclamationMark : Icon.Clock}
          onAction={error ? revalidate : undefined}
        />
      </MenuBarExtra>
    );
  }

  const total = todaySeconds(data);
  const currentRun = currentRunSeconds(data);
  const tintColor = data.running ? Color.Green : Color.PrimaryText;
  const toggleTitle = data.running ? "Stop Tracking" : "Start Tracking";

  return (
    <MenuBarExtra
      icon={{ source: Icon.Stopwatch, tintColor }}
      title={formatDuration(total)}
      tooltip={`Taxmaro · ${data.running ? "Tracking" : "Stopped"} · ${formatDuration(total, "short")} today`}
      isLoading={isLoading || isMutating}
    >
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={data.running ? "Tracking" : "Stopped"}
          subtitle={data.running ? formatDuration(currentRun, "short") : undefined}
          icon={{ source: Icon.CircleFilled, tintColor }}
        />
        <MenuBarExtra.Item title="Today" subtitle={formatDuration(total, "short")} icon={Icon.Clock} />
        <MenuBarExtra.Item
          title={toggleTitle}
          icon={data.running ? Icon.Stop : Icon.Play}
          onAction={isMutating ? undefined : () => toggle(data)}
        />
      </MenuBarExtra.Section>
      <MenuBarExtra.Item title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
    </MenuBarExtra>
  );
};

export default Command;
