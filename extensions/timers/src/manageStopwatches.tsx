import { Action, ActionPanel, Clipboard, Color, Icon, List, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useStopwatches from "./hooks/useStopwatches";
import RenameView from "./RenameView";
import { formatTime, formatDateTime } from "./formatUtils";

export default function Command() {
  const { stopwatches, isLoading, refreshSWes, handleStartSW, handleStopSW } = useStopwatches();
  const { push } = useNavigation();

  useEffect(() => {
    refreshSWes();
    setInterval(() => {
      refreshSWes();
    }, 1000);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section
        title={stopwatches?.length !== 0 && stopwatches != null ? "Currently Running" : "No Stopwatches Running"}
      >
        {stopwatches?.map((sw) => (
          <List.Item
            key={sw.originalFile}
            icon={{ source: Icon.Clock, tintColor: Color.Red }}
            title={sw.name}
            subtitle={formatTime(sw.timeElapsed) + " elapsed"}
            accessoryTitle={"Started at " + formatDateTime(sw.timeStarted)}
            actions={
              <ActionPanel>
                <Action title="Stop Stopwatch" onAction={() => handleStopSW(sw)} />
                <Action
                  title="Rename Stopwatch"
                  onAction={() => push(<RenameView currentName={sw.name} originalFile={sw.originalFile} ctID={null} />)}
                />
                <Action
                  title="Copy Current Time"
                  shortcut={{ modifiers: ["opt"], key: "c" }}
                  onAction={() => Clipboard.copy(formatTime(sw.timeElapsed))}
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
