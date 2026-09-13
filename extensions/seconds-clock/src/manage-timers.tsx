import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  Toast,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect } from "react";

import { useActiveActivity } from "./hooks/use-active-activity";
import { useNow } from "./hooks/use-now";
import {
  formatActivityDuration,
  getTimerRemainingMs,
  getTimerTitle,
  addFavoriteTimer,
  extendTimer,
  removeAllTimers,
  removeCompletedTimers,
  removeTimer,
  sortTimersByEnding,
  updateTimerName,
  type TimerActivity,
} from "./lib/activity";

export default function Command() {
  const now = useNow();
  const nowMs = now.getTime();
  const { activityState, isLoading, refreshActivity } = useActiveActivity();
  const timers = activityState ? sortTimersByEnding(activityState.timers) : [];

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void removeCompletedTimers(nowMs)
      .then((completedTimers) => {
        if (completedTimers.length > 0) {
          void refreshActivity();
        }
      })
      .catch(() => undefined);
  }, [isLoading, nowMs, refreshActivity]);

  async function stopTimer(timer: TimerActivity) {
    const changed = await removeTimer(timer.id);
    await showActionToast(
      changed ? `${getTimerTitle(timer)} Stopped` : "Timer No Longer Running",
      changed ? Toast.Style.Success : Toast.Style.Failure,
    );
    await refreshActivity();
  }

  async function stopAllTimers() {
    await removeAllTimers();
    await showActionToast("All Timers Stopped");
    await refreshActivity();
  }

  async function saveTimerAsFavorite(timer: TimerActivity) {
    await addFavoriteTimer(timer.durationMs, timer.name);
    await showActionToast(`${getTimerTitle(timer)} Saved as Favorite`);
  }

  async function addTime(timer: TimerActivity, minutes: number) {
    const changed = await extendTimer(timer.id, minutes * 60 * 1000);
    await showActionToast(
      changed
        ? `Added ${minutes} Minutes to ${getTimerTitle(timer)}`
        : "Timer No Longer Running",
      changed ? Toast.Style.Success : Toast.Style.Failure,
    );
    await refreshActivity();
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search timers">
      {isLoading ? null : timers.length === 0 ? (
        <List.EmptyView
          icon={Icon.Clock}
          title="No Running Timers"
          description="Use Set Timer to start one."
        />
      ) : (
        timers.map((timer) => (
          <TimerListItem
            key={timer.id}
            timer={timer}
            now={nowMs}
            onStop={stopTimer}
            onStopAll={stopAllTimers}
            onSaveFavorite={saveTimerAsFavorite}
            onAddTime={addTime}
            onRefresh={refreshActivity}
          />
        ))
      )}
    </List>
  );
}

function TimerListItem({
  timer,
  now,
  onStop,
  onStopAll,
  onSaveFavorite,
  onAddTime,
  onRefresh,
}: {
  timer: TimerActivity;
  now: number;
  onStop: (timer: TimerActivity) => Promise<void>;
  onStopAll: () => Promise<void>;
  onSaveFavorite: (timer: TimerActivity) => Promise<void>;
  onAddTime: (timer: TimerActivity, minutes: number) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  return (
    <List.Item
      title={getTimerTitle(timer)}
      subtitle={formatActivityDuration(getTimerRemainingMs(timer, now))}
      icon={Icon.Clock}
      actions={
        <ActionPanel>
          <Action
            title="Stop Timer"
            icon={Icon.XMarkCircle}
            onAction={() => onStop(timer)}
          />
          <Action
            title="Add 5 Minutes"
            icon={Icon.Plus}
            onAction={() => onAddTime(timer, 5)}
          />
          <Action
            title="Add 30 Minutes"
            icon={Icon.Plus}
            onAction={() => onAddTime(timer, 30)}
          />
          <Action.Push
            title="Rename Timer"
            icon={Icon.Pencil}
            target={<RenameTimerForm timer={timer} onRenamed={onRefresh} />}
          />
          <Action
            title="Save as Favorite"
            icon={Icon.Star}
            onAction={() => onSaveFavorite(timer)}
          />
          <Action
            title="Stop All Timers"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={onStopAll}
          />
        </ActionPanel>
      }
    />
  );
}

function RenameTimerForm({
  timer,
  onRenamed,
}: {
  timer: TimerActivity;
  onRenamed: () => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function renameTimer(values: { name: string }) {
    const changed = await updateTimerName(timer.id, values.name);
    await showActionToast(
      changed ? "Timer Renamed" : "Timer No Longer Running",
      changed ? Toast.Style.Success : Toast.Style.Failure,
    );
    await onRenamed();
    pop();
  }

  return (
    <Form
      navigationTitle="Rename Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Rename Timer"
            icon={Icon.Pencil}
            onSubmit={renameTimer}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="name"
        title="Timer Name"
        defaultValue={timer.name ?? ""}
        placeholder="Timer"
      />
    </Form>
  );
}

async function showActionToast(
  title: string,
  style: Toast.Style = Toast.Style.Success,
): Promise<void> {
  await showToast({
    style,
    title,
  });
}
