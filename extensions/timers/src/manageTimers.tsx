import { Action, ActionPanel, Icon, LaunchProps, List, Toast, popToRoot, showToast, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import useTimers from "./hooks/useTimers";
import CustomTimerView from "./startCustomTimer";
import { CommandLinkParams } from "./backend/types";
import { readCustomTimers, startTimer } from "./backend/timerBackend";
import RunningTimerListItem from "./components/RunningTimerListItem";
import CustomTimerListItem from "./components/CustomTimerListItem";

export default function Command(props: LaunchProps<{ launchContext: CommandLinkParams }>) {
  if (props.launchContext?.timerID) {
    const customTimers = readCustomTimers();
    const ct = customTimers[props.launchContext.timerID];
    if (ct == undefined) {
      showToast({
        style: Toast.Style.Failure,
        title: "This custom timer no longer exists!",
      });
    } else {
      startTimer({
        timeInSeconds: ct.timeInSeconds,
        timerName: ct.name,
        selectedSound: ct.selectedSound,
      }).then(() => popToRoot());
      return;
    }
  }

  const { timers, customTimers, isLoading, refreshTimers } = useTimers();
  const { push } = useNavigation();

  useEffect(() => {
    refreshTimers();
    setInterval(() => {
      refreshTimers();
    }, 1000);
  }, []);

  return (
    <List isLoading={isLoading}>
      <List.Section title={timers?.length !== 0 && timers != null ? "Currently Running" : "No Timers Running"}>
        {timers?.map((timer) => <RunningTimerListItem key={timer.originalFile} timer={timer} />)}
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
          .map((ctID) => <CustomTimerListItem key={ctID} customTimer={customTimers[ctID]} id={ctID} />)}
      </List.Section>
    </List>
  );
}
