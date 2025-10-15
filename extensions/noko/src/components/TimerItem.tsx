import { Icon, List, ActionPanel, Action } from "@raycast/api";
import { memo, useMemo } from "react";
import { TimerStateEnum, TimerType } from "../types";
import { useTimerActions } from "../hooks/useTimerActions";
import useElapsedTime from "../hooks/useElapsedTime";

interface TimerItemProps {
  timer: TimerType;
  onAddEntry: () => void;
  onViewEntries: () => void;
  onLogTimer: (project: TimerType["project"]) => void;
  onTimerChange?: () => void;
}

const TimerItem = memo<TimerItemProps>(
  ({ timer, onAddEntry, onViewEntries, onLogTimer, onTimerChange }) => {
    const currentProject = timer.project;

    const elapsedTime = useElapsedTime(timer);

    const { startTimer, pauseTimer, discardTimer } = useTimerActions({
      onSuccess: onTimerChange,
    });

    const subtitle = useMemo(() => {
      const state =
        timer.state === TimerStateEnum.Running ? "Running" : "Paused";
      return `${state} - ${elapsedTime}`;
    }, [timer.state, elapsedTime]);

    const timerActions = useMemo(() => {
      if (timer.state === TimerStateEnum.Running) {
        return (
          <>
            <Action
              title="Pause Timer"
              icon={Icon.Pause}
              onAction={() => pauseTimer(currentProject)}
            />
            <Action
              title="Log Timer"
              icon={Icon.Stop}
              onAction={() => onLogTimer(currentProject)}
            />
            <Action
              title="Discard Timer"
              icon={Icon.Trash}
              onAction={() => discardTimer(currentProject)}
              style={Action.Style.Destructive}
            />
          </>
        );
      }

      // Paused timer actions
      return (
        <>
          <Action
            title="Resume Timer"
            icon={Icon.Play}
            onAction={() => startTimer(currentProject)}
          />
          <Action
            title="Log Timer"
            icon={Icon.Stop}
            onAction={() => onLogTimer(currentProject)}
          />
          <Action
            title="Discard Timer"
            icon={Icon.Trash}
            onAction={() => discardTimer(currentProject)}
            style={Action.Style.Destructive}
          />
        </>
      );
    }, [
      timer.state,
      currentProject,
      startTimer,
      pauseTimer,
      discardTimer,
      onLogTimer,
    ]);

    return (
      <List.Item
        title={currentProject.name}
        subtitle={subtitle}
        icon={{
          source: Icon.CircleFilled,
          tintColor: currentProject.color,
        }}
        actions={
          <ActionPanel>
            {timerActions}
            <Action
              title="Add Entry"
              icon={Icon.Plus}
              onAction={onAddEntry}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
            <Action
              title="View Entries"
              icon={Icon.List}
              onAction={onViewEntries}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
          </ActionPanel>
        }
      />
    );
  },
);

TimerItem.displayName = "TimerItem";

export { TimerItem };
