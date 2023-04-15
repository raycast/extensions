import { Detail, launchCommand, LaunchType, closeMainWindow, popToRoot, List, Icon } from "@raycast/api";
import { ActionPanel, Action } from "@raycast/api";
import { exec } from "child_process";
import {
  continueInterval,
  createInterval,
  getCurrentInterval,
  isPaused,
  pauseInterval,
  preferences,
  resetInterval,
} from "../lib/intervals";

const createAction = (action: () => void) => () => {
  action();

  try {
    launchCommand({
      name: "pomodoro-menu-bar",
      type: LaunchType.UserInitiated,
    });
  } catch (error) {
    console.error(error);
  }

  popToRoot();
  closeMainWindow();
};

const ActionsList = () => {
  const currentInterval = getCurrentInterval();

  return (
    <List navigationTitle="Control Pomodoro Timers">
      {currentInterval ? (
        <>
          {isPaused(currentInterval) ? (
            <List.Item
              title="Continue"
              icon={Icon.Play}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(continueInterval)} title={"Continue"} />
                </ActionPanel>
              }
            />
          ) : (
            <List.Item
              title="Pause"
              icon={Icon.Pause}
              actions={
                <ActionPanel>
                  <Action onAction={createAction(pauseInterval)} title={"Pause"} />
                </ActionPanel>
              }
            />
          )}
          <List.Item
            title="Reset"
            icon={Icon.Stop}
            actions={
              <ActionPanel>
                <Action onAction={createAction(resetInterval)} title={"Reset"} />
              </ActionPanel>
            }
          />
        </>
      ) : (
        <>
          <List.Item
            title={`Focus`}
            subtitle={`${preferences.focusIntervalDuration}:00`}
            icon={`🎯`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("focus"))} title={"Focus"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Short Break`}
            subtitle={`${preferences.shortBreakIntervalDuration}:00`}
            icon={`🧘‍♂️`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("short-break"))} title={"Short Break"} />
              </ActionPanel>
            }
          />
          <List.Item
            title={`Long Break`}
            subtitle={`${preferences.longBreakIntervalDuration}:00`}
            icon={`🚶`}
            actions={
              <ActionPanel>
                <Action onAction={createAction(() => createInterval("long-break"))} title={"Long Break"} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
};

const EndOfInterval = () => {
  if (preferences.sound) {
    exec(`afplay /System/Library/Sounds/${preferences.sound}.aiff -v 10 && $$`);
  }

  return (
    <Detail
      navigationTitle={`Interval completed`}
      markdown={`${preferences.completionImage}`}
      actions={
        <ActionPanel title="Start Next Interval">
          <Action
            title="Focus"
            onAction={createAction(() => createInterval("focus"))}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
          />
          <Action
            title="Short Break"
            onAction={createAction(() => createInterval("short-break"))}
            shortcut={{ modifiers: ["cmd"], key: "s" }}
          />
          <Action
            title="Long Break"
            onAction={createAction(() => createInterval("long-break"))}
            shortcut={{ modifiers: ["cmd"], key: "l" }}
          />
        </ActionPanel>
      }
    />
  );
};

export default function Command(props: { launchContext?: { currentInterval: string } }) {
  return props.launchContext?.currentInterval ? <EndOfInterval /> : <ActionsList />;
}
