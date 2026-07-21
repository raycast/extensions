import { Action, ActionPanel, Alert, Color, confirmAlert, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useState } from "react";
import { deleteTimer, getToday, startTimer, stopContext, stopTimer } from "./api/client";
import type { Timer } from "./api/types";
import { ensureCacheOwner } from "./lib/cache";
import { showApiErrorToast, withRateLimitRetry } from "./lib/errors";
import {
  currentContextIntervalSeconds,
  currentTimerIntervalSeconds,
  elapsedContextSeconds,
  elapsedTimerSeconds,
  formatClock,
  formatCompactDuration,
  formatDuration,
  formatRemaining,
  formatScheduledRange,
  remainingSeconds,
} from "./lib/format";
import { refreshMenuBar } from "./lib/refresh";

const APP_URL = "https://timist.app/app";

export default function ShowStatus() {
  ensureCacheOwner();
  const { data, isLoading, mutate } = useCachedPromise(getToday, [], {
    keepPreviousData: true,
    onError: (error) => void showApiErrorToast(error),
  });

  const runningTimer = data?.timers.find((timer) => timer.active);
  const activeContext = data?.active_context ?? undefined;
  const hasRunning = Boolean(runningTimer || activeContext);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasRunning]);

  async function run(operation: () => Promise<unknown>) {
    try {
      await withRateLimitRetry(operation);
      await mutate();
      await refreshMenuBar();
    } catch (error) {
      await showApiErrorToast(error, { refetch: () => mutate() });
    }
  }

  async function onDelete(timer: Timer) {
    const confirmed = await confirmAlert({
      title: "Delete Block",
      message: `Delete “${timer.title}”? This can't be undone here.`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (confirmed) {
      await run(() => deleteTimer(timer.id));
    }
  }

  function timerAccessories(timer: Timer): List.Item.Accessory[] {
    const accessories: List.Item.Accessory[] = [];
    if (timer.project) accessories.push({ tag: timer.project.name });
    for (const tag of timer.tags) accessories.push({ tag: `#${tag.name}` });
    return accessories;
  }

  // Baselines already include each item's own completed portion, so only the
  // live current-interval delta is added — never the total-elapsed value.
  const timerBaseline = data?.stats?.completed_timer_duration_seconds;
  const contextBaseline = data?.stats?.completed_context_duration_seconds;
  const liveTimerTotal =
    timerBaseline != null ? timerBaseline + (runningTimer ? currentTimerIntervalSeconds(runningTimer, now) : 0) : null;
  const liveContextTotal =
    contextBaseline != null
      ? contextBaseline + (activeContext ? currentContextIntervalSeconds(activeContext, now) : 0)
      : null;

  const statsParts: string[] = [];
  if (liveTimerTotal != null) {
    statsParts.push(`Timers today: ${formatCompactDuration(liveTimerTotal)}`);
  }
  if (liveContextTotal != null) {
    statsParts.push(`Context: ${formatCompactDuration(liveContextTotal)}`);
  }

  return (
    <List isLoading={isLoading}>
      <List.EmptyView
        icon={Icon.Clock}
        title="Nothing tracked yet today"
        actions={
          <ActionPanel>
            <Action
              title="Start Timer"
              icon={Icon.Play}
              onAction={() => void launchCommand({ name: "start-timer", type: LaunchType.UserInitiated })}
            />
          </ActionPanel>
        }
      />
      {hasRunning && (
        <List.Section title="Running">
          {runningTimer && (
            <List.Item
              key={`running-${runningTimer.id}`}
              icon={{ source: Icon.Play, tintColor: Color.Green }}
              title={runningTimer.title}
              accessories={[
                ...timerAccessories(runningTimer),
                ...(() => {
                  const remaining = remainingSeconds(runningTimer, now);
                  return remaining === undefined
                    ? []
                    : [
                        {
                          text: formatRemaining(remaining),
                          icon: {
                            source: Icon.Hourglass,
                            tintColor: remaining < 0 ? Color.Red : Color.SecondaryText,
                          },
                          tooltip: remaining < 0 ? "Overdue" : "Remaining",
                        },
                      ];
                })(),
                { text: formatClock(elapsedTimerSeconds(runningTimer, now)) },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Stop Timer"
                    icon={Icon.Stop}
                    onAction={() => void run(() => stopTimer(runningTimer.id))}
                  />
                  <Action.OpenInBrowser title="Open Timist" url={APP_URL} />
                </ActionPanel>
              }
            />
          )}
          {activeContext && (
            <List.Item
              key={`running-${activeContext.id}`}
              icon={{ source: Icon.CircleFilled, tintColor: Color.Blue }}
              title={activeContext.display_label}
              accessories={[{ text: formatClock(elapsedContextSeconds(activeContext, now)) }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Stop Context"
                    icon={Icon.Stop}
                    onAction={() => void run(() => stopContext(activeContext.id))}
                  />
                  <Action.OpenInBrowser title="Open Timist" url={APP_URL} />
                </ActionPanel>
              }
            />
          )}
        </List.Section>
      )}
      {(data?.timers.length ?? 0) > 0 && (
        <List.Section title="Today">
          {data?.timers.map((timer) => (
            <List.Item
              key={timer.id}
              icon={timer.active ? { source: Icon.Play, tintColor: Color.Green } : { source: Icon.Circle }}
              title={timer.title}
              accessories={[
                ...timerAccessories(timer),
                {
                  text: timer.active
                    ? formatCompactDuration(elapsedTimerSeconds(timer, now))
                    : timer.completed_duration_seconds > 0
                      ? formatDuration(timer.completed_duration_seconds)
                      : (formatScheduledRange(timer) ?? "Not started"),
                },
              ]}
              actions={
                <ActionPanel>
                  {timer.active ? (
                    <Action title="Stop" icon={Icon.Stop} onAction={() => void run(() => stopTimer(timer.id))} />
                  ) : (
                    <Action title="Start" icon={Icon.Play} onAction={() => void run(() => startTimer(timer.id))} />
                  )}
                  <Action.OpenInBrowser title="Open Timist" url={APP_URL} />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => void onDelete(timer)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
      {statsParts.length > 0 && (
        <List.Section title="Stats">
          <List.Item icon={Icon.BarChart} title={statsParts.join(" · ")} />
        </List.Section>
      )}
    </List>
  );
}
