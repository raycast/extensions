import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import RenameView from "./RenameView";
import CustomTimerView from "./startCustomTimer";
import { formatTime } from "./formatUtils";

export default function Command() {
  const {
    timer,
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

  return (
    <List isLoading={isLoading}>
      <List.Section title={timer ? "Currently Running" : "No Sleep Timer Running"}>
        {timer && (
          <List.Item
            key={timer.originalFile}
            icon={{ source: Icon.Moon, tintColor: Color.Yellow }}
            title={timer.name}
            subtitle={formatTime(timer.timeLeft) + " left"}
            accessoryTitle={formatTime(timer.secondsSet) + " originally"}
            actions={
              <ActionPanel>
                <Action title="Stop Sleep Timer" onAction={() => handleStopTimer()} />
                <Action
                  title="Rename Sleep Timer"
                  onAction={() =>
                    push(<RenameView currentName={timer.name} originalFile={timer.originalFile} ctID={null} />)
                  }
                />
                <Action
                  title="Save Sleep Timer as Preset"
                  shortcut={{
                    modifiers: ["cmd", "shift"],
                    key: "enter",
                  }}
                  onAction={() => handleCreateCT(timer)}
                />
              </ActionPanel>
            }
          />
        )}
        <List.Item
          key={0}
          icon={Icon.Clock}
          title={"Create a new sleep timer"}
          subtitle={"Press Enter to start a sleep timer"}
          actions={
            <ActionPanel>
              <Action
                title="Start Sleep Timer"
                onAction={() => push(<CustomTimerView arguments={{ hours: "", minutes: "", seconds: "" }} />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Custom Sleep Timers">
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
                  <Action title="Start Sleep Timer" onAction={() => handleStartCT(customTimers[ctID])} />
                  <Action
                    title="Rename Sleep Timer"
                    onAction={() =>
                      push(
                        <RenameView currentName={customTimers[ctID].name} originalFile={"customTimer"} ctID={ctID} />,
                      )
                    }
                  />
                  <Action
                    title="Delete Custom Sleep Timer"
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
