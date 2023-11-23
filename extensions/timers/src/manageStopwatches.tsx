import { Action, ActionPanel, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useStopwatches from "./hooks/useStopwatches";
import RenameView from "./RenameView";
import { formatTime, formatDateTime } from "./formatUtils";
import { Stopwatch } from "./types";

export default function Command() {
  const {
    stopwatches,
    isLoading,
    refreshSWes,
    handleRestartSW,
    handleStartSW,
    handleStopSW,
    handlePauseSW,
    handleUnpauseSW,
  } = useStopwatches();
  const { push } = useNavigation();

  useEffect(() => {
    refreshSWes();
    setInterval(() => {
      refreshSWes();
    }, 1000);
  }, []);

  const pausedTag = { tag: { value: "Paused", color: Color.Red } };
  const unpausedTag = { tag: { value: "Running", color: Color.Green } };
  const pausedIcon = { source: Icon.Clock, tintColor: Color.Red };
  const unpausedIcon = { source: Icon.Clock, tintColor: Color.Green };

  return (
    <List isLoading={isLoading}>
      <List.Section
        title={stopwatches?.length !== 0 && stopwatches != null ? "Currently Running" : "No Stopwatches Running"}
      >
        {stopwatches?.map((sw: Stopwatch) => (
          <List.Item
            key={sw.swID}
            icon={sw.lastPaused == "----" ? unpausedIcon : pausedIcon}
            title={sw.name}
            subtitle={formatTime(sw.timeElapsed) + " elapsed"}
            accessories={[
              { text: "Started at " + formatDateTime(sw.timeStarted) },
              sw.lastPaused == "----" ? unpausedTag : pausedTag,
            ]}
            actions={
              <ActionPanel>
                {sw.lastPaused == "----" ? (
                  <Action title="Pause Stopwatch" onAction={() => handlePauseSW(sw.swID)} />
                ) : (
                  <Action title="Unpause Stopwatch" onAction={() => handleUnpauseSW(sw.swID)} />
                )}
                <Action
                  title="Rename Stopwatch"
                  onAction={() => push(<RenameView currentName={sw.name} originalFile={"stopwatch"} ctID={sw.swID} />)}
                />
                <Action.CopyToClipboard
                  title="Copy Current Time"
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                  content={formatTime(sw.timeElapsed)}
                />
                <Action
                  title="Restart Stopwatch"
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => handleRestartSW(sw)}
                />
                <Action
                  title="Stop Stopwatch"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  onAction={() => handleStopSW(sw)}
                />
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          key={0}
          icon={Icon.Clock}
          title={"Create a new stopwatch"}
          subtitle={"Press Enter to start a stopwatch"}
          actions={
            <ActionPanel>
              <Action title="Start Stopwatch" onAction={() => handleStartSW()} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
