import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import RenameView from "./RenameView";
import CustomTimerView from "./startCustomTimer";
import { formatDateTime, formatTime } from "./formatUtils";

export default function Command() {
  const {
    timers,
    customTimers,
    isLoading,
    refreshTimers,
    handleStopTimer,
    handleStartCT,
    handleCreateCT,
    handleDeleteCT,
  } = useTimers();
  const { push } = useNavigation();

  useEffect(() => {
    refreshTimers();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  const runningIcon = { tag: { value: "Running", color: Color.Yellow } };
  const finishedIcon = { tag: { value: "Finished!", color: Color.Green } };

  return (
    <List isLoading={isLoading}>
      <List.Section title={timers?.length !== 0 && timers != null ? "Currently Running" : "No Timers Running"}>
        {timers?.map((timer) => (
          <List.Item
            key={timer.originalFile}
            icon={{ source: Icon.Clock, tintColor: timer.timeLeft === 0 ? Color.Green : Color.Yellow }}
            title={timer.name}
            subtitle={formatTime(timer.timeLeft) + " left"}
            accessories={[
              { text: formatTime(timer.secondsSet) + " originally" },
              { text: `${timer.timeLeft === 0 ? "Ended" : "Ends"} at ${formatDateTime(timer.timeEnds)}` },
              timer.timeLeft === 0 ? finishedIcon : runningIcon,
            ]}
            actions={
              <ActionPanel>
                <Action title="Stop Timer" onAction={() => handleStopTimer(timer)} />
                <Action
                  title="Rename Timer"
                  onAction={() =>
                    push(<RenameView currentName={timer.name} originalFile={timer.originalFile} ctID={null} />)
                  }
                />
                <Action
                  title="Save Timer as Preset"
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "enter",
                  }}
                  onAction={() => handleCreateCT(timer)}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          key={0}
          icon={Icon.Clock}
          title={"Create a new timer"}
          subtitle={"Press Enter to start a timer"}
          actions={
            <ActionPanel>
              <Action
                title="Start Timer"
                onAction={() => push(<CustomTimerView arguments={{ hours: "", minutes: "", seconds: "" }} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Custom Timers">
        {Object.keys(customTimers)
          ?.sort((a, b) => {
            return customTimers[a].timeInSeconds - customTimers[b].timeInSeconds;
          })
          .map((ctID) => (
            <List.Item
              key={ctID}
              icon={Icon.Clock}
              title={customTimers[ctID].name}
              subtitle={formatTime(customTimers[ctID].timeInSeconds)}
              actions={
                <ActionPanel>
                  <Action title="Start Timer" onAction={() => handleStartCT(customTimers[ctID])} />
                  <Action
                    title="Rename Timer"
                    onAction={() =>
                      push(
                        <RenameView currentName={customTimers[ctID].name} originalFile={"customTimer"} ctID={ctID} />
                      )
                    }
                  />
                  <Action
                    title="Delete Custom Timer"
                    shortcut={{
                      modifiers: ["ctrl"],
                      key: "x",
                    }}
                    onAction={() => handleDeleteCT(ctID)}
                  />
                </ActionPanel>
              }
            />
          ))}
      </List.Section>
    </List>
  );
}
