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
    let disposed = false;
    if (timerID) {
      void (async () => {
        try {
          const ct = readCustomTimers()[timerID];
          if (!ct) throw new Error("This preset no longer exists");
          const started = await startTimer({
            timeInSeconds: ct.timeInSeconds,
            timerName: ct.name,
            selectedSound: ct.selectedSound,
          });
          if (started && !disposed) await popToRoot();
        } catch (error) {
          if (!disposed) await showError(error, { title: "Could Not Start Preset" });
        }
      })();
    }
    refreshTimers();
    const interval = setInterval(() => {
      refreshTimers();
    }, 1000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, [timerID]);

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
