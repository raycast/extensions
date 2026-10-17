import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { Timer } from "../backend/types";
import { formatDateTime, formatTime } from "../backend/formatUtils";
import useTimers from "../hooks/useTimers";
import RenameAction from "./RenameAction";
import { showError } from "@chrismessina/raycast-kit";

interface RunningTimerListItemProps {
  timer: Timer;
}

const pausedLabel = { tag: { value: "Paused", color: Color.Red } };
const pausedIcon = { source: Icon.Clock, tintColor: Color.Red };
const runningIcon = { source: Icon.Clock, tintColor: Color.Yellow };
const runningLabel = { tag: { value: "Running", color: Color.Yellow } };
const finishedIcon = { source: Icon.Clock, tintColor: Color.Green };
const finishedLabel = { tag: { value: "Finished!", color: Color.Green } };
const failedLabel = { tag: { value: "Alert Error", color: Color.Red } };

export default function RunningTimerListItem({ timer }: RunningTimerListItemProps) {
  const { handlePauseTimer, handleUnpauseTimer, handleStopTimer, handleCreateCT } = useTimers();
  return (
    <List.Item
      icon={timer.timeLeft === 0 ? finishedIcon : timer.lastPaused !== "---" ? pausedIcon : runningIcon}
      title={timer.name}
      subtitle={formatTime(timer.timeLeft) + " left"}
      accessories={[
        { text: formatTime(timer.secondsSet) + " originally" },
        { text: `${timer.timeLeft === 0 ? "Ended" : "Ends"} at ${formatDateTime(timer.timeEnds)}` },
        timer.workerError
          ? { ...failedLabel, tooltip: timer.workerError }
          : timer.timeLeft === 0
            ? finishedLabel
            : timer.lastPaused !== "---"
              ? pausedLabel
              : runningLabel,
      ]}
      actions={
        <ActionPanel>
          {timer.workerError ? (
            <Action
              title="Show Alert Error"
              icon={Icon.ExclamationMark}
              onAction={() =>
                showError(new Error(timer.workerError), {
                  title: "Timer Alert Failed",
                  copyContext: `Timer: ${timer.name}`,
                })
              }
            />
          ) : null}
          {timer.timeLeft === 0 ? (
            <Action title="Stop Timer" icon={Icon.Stop} onAction={() => handleStopTimer(timer)} />
          ) : (
            <Action
              title={(timer.lastPaused !== "---" ? "Unpause" : "Pause") + " Timer"}
              icon={timer.lastPaused !== "---" ? Icon.Play : Icon.Pause}
              onAction={timer.lastPaused !== "---" ? () => handleUnpauseTimer(timer) : () => handlePauseTimer(timer)}
            />
          )}
          <RenameAction renameLabel={"Timer"} currentName={timer.name} originalFile={timer.originalFile} ctID={null} />
          <Action
            title="Stop Timer"
            icon={Icon.Stop}
            style={Action.Style.Destructive}
            shortcut={Keyboard.Shortcut.Common.Remove}
            onAction={() => handleStopTimer(timer)}
          />
          <Action
            title="Save Timer as Preset"
            icon={Icon.SaveDocument}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={() => handleCreateCT(timer)}
          />
        </ActionPanel>
      }
    />
  );
}
