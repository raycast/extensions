import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { Timer } from "../backend/types";
import { formatDateTime, formatTime } from "../backend/formatUtils";
import useTimers from "../hooks/useTimers";
import RenameAction from "./RenameAction";

interface RunningTimerListItemProps {
  timer: Timer;
}

const runningLabel = { tag: { value: "Running", color: Color.Yellow } };
const finishedLabel = { tag: { value: "Finished!", color: Color.Green } };

export default function RunningTimerListItem({ timer }: RunningTimerListItemProps) {
  const { handleStopTimer, handleCreateCT } = useTimers();
  return (
    <List.Item
      icon={{ source: Icon.Clock, tintColor: timer.timeLeft === 0 ? Color.Green : Color.Yellow }}
      title={timer.name}
      subtitle={formatTime(timer.timeLeft) + " left"}
      accessories={[
        { text: formatTime(timer.secondsSet) + " originally" },
        { text: `${timer.timeLeft === 0 ? "Ended" : "Ends"} at ${formatDateTime(timer.timeEnds)}` },
        timer.timeLeft === 0 ? finishedLabel : runningLabel,
      ]}
      actions={
        <ActionPanel>
          <Action title="Stop Timer" icon={Icon.Stop} onAction={() => handleStopTimer(timer)} />
          <RenameAction renameLabel={"Timer"} currentName={timer.name} originalFile={timer.originalFile} ctID={null} />
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
