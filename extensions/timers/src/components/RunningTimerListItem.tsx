import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Timer } from "../backend/types";
import { formatDateTime, formatTime } from "../backend/formatUtils";
import useTimers from "../hooks/useTimers";
import RenameAction from "./RenameAction";

interface RunningTimerListItemProps {
  timer: Timer;
}

const pausedLabel = { tag: { value: "Paused", color: Color.Red } };
const pausedIcon = { source: Icon.Clock, tintColor: Color.Red };
const runningIcon = { source: Icon.Clock, tintColor: Color.Yellow };
const runningLabel = { tag: { value: "Running", color: Color.Yellow } };
const finishedIcon = { source: Icon.Clock, tintColor: Color.Green };
const finishedLabel = { tag: { value: "Finished!", color: Color.Green } };

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
        timer.timeLeft === 0 ? finishedLabel : timer.lastPaused !== "---" ? pausedLabel : runningLabel,
      ]}
      actions={
        <ActionPanel>
          {timer.timeLeft === 0 ? (
            <Action title="Stop Timer" icon={Icon.Stop} onAction={() => handleStopTimer(timer)} />
          ) : (
            <Action
              title={(timer.lastPaused !== "---" ? "Unpause" : "Pause") + " Timer"}
              icon={Icon.Pause}
              onAction={timer.lastPaused !== "---" ? () => handleUnpauseTimer(timer) : () => handlePauseTimer(timer)}
            />
          )}
          <RenameAction renameLabel={"Timer"} currentName={timer.name} originalFile={timer.originalFile} ctID={null} />
          <Action
            title="Stop Timer"
            icon={Icon.Stop}
            shortcut={{
              modifiers: ["ctrl"],
              key: "x",
            }}
            onAction={() => handleStopTimer(timer)}
          />
          <Action
            title="Save Timer as Preset"
            icon={Icon.SaveDocument}
            shortcut={{
              modifiers: ["cmd", "shift"],
              key: "enter",
            }}
            onAction={() => handleCreateCT(timer)}
          />
        </ActionPanel>
      }
    />
  );
}
