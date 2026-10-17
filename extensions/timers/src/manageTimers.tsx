import { Action, ActionPanel, Icon, LaunchProps, List, popToRoot, useNavigation } from "@raycast/api";
import { showError } from "@chrismessina/raycast-kit";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import CustomTimerView from "./startCustomTimer";
import { CommandLinkParams } from "./backend/types";
import { readCustomTimers, startTimer } from "./backend/timerBackend";
import RunningTimerListItem from "./components/RunningTimerListItem";
import CustomTimerListItem from "./components/CustomTimerListItem";

export default function Command(props: LaunchProps<{ launchContext: CommandLinkParams }>) {
  const { timers, customTimers, isLoading, refreshTimers } = useTimers();
  const { push } = useNavigation();
  const timerID = props.launchContext?.timerID;

  useEffect(() => {
    if (timerID) {
      const customTimers = readCustomTimers();
      const ct = customTimers[timerID];
      if (ct == undefined) {
        showError(new Error("This preset no longer exists"), { title: "Could Not Start Preset" });
      } else {
        startTimer({
          timeInSeconds: ct.timeInSeconds,
          timerName: ct.name,
          selectedSound: ct.selectedSound,
        })
          .then((started) => {
            if (started) return popToRoot();
          })
          .catch((error) => showError(error, { title: "Could Not Start Timer" }));
      }
      return;
    }
    refreshTimers();
    const interval = setInterval(() => {
      refreshTimers();
    }, 1000);
    return () => clearInterval(interval);
  }, [timerID]);

  if (timerID) return null;

  return (
    <List isLoading={isLoading}>
      <List.Section title={timers?.length !== 0 && timers != null ? "Currently Running" : "No Timers Running"}>
        {timers?.map((timer) => (
          <RunningTimerListItem key={timer.originalFile} timer={timer} />
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
                icon={Icon.Hourglass}
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
            <CustomTimerListItem key={ctID} customTimer={customTimers[ctID]} id={ctID} />
          ))}
      </List.Section>
    </List>
  );
}
