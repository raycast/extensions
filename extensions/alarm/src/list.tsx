import { Action, ActionPanel, Color, Icon, List, Toast, showToast } from "@raycast/api";
import { getTimers, removeTimer, secondsToString } from "./utils";
import { useEffect, useState } from "react";

import dayjs from "dayjs";
import { exec } from "child_process";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

const DAY_IN_MS = 86400000;

export default function Timers() {
  const [timers, setTimers] = useState<Timer[]>([]);

  useEffect(() => {
    const initialize = async () => {
      setTimers((await getTimers()).sort((a, b) => a.timeMS - b.timeMS));
    };
    initialize();
  }, []);

  function stopTimer(pid: number) {
    exec(`kill ${pid}`, (error) => {
      if (error) {
        showToast(Toast.Style.Failure, "Unable to stop alarm");
        return;
      }
      removeTimer(pid);
      showToast(Toast.Style.Success, `Stopped alarm for ${timers.find((timer) => timer.id === pid)?.inputStr || "?"}`);
      setTimers((ts) => ts.filter((timer) => timer.id !== pid));
    });
  }

  return (
    <List>
      <List.Section title={"Active Alarms"}>
        {timers.map(({ timeMS, inputStr, id }) => {
          const timeObject = dayjs(timeMS);
          const lessThanDay = timeMS - Date.now() < DAY_IN_MS;
          return (
            <List.Item
              key={id}
              title={inputStr || secondsToString(Math.floor(timeMS / 1000))}
              icon={{ source: Icon.Clock, tintColor: Color.Green }}
              subtitle={
                lessThanDay
                  ? secondsToString(Math.floor((timeMS - Date.now()) / 1000), false) + " left"
                  : timeObject.fromNow()
              }
              accessories={[{ text: timeObject.format(lessThanDay ? "h:mmA" : "MMM D") }]}
              actions={
                <ActionPanel>
                  <Action title="Remove Alarm" style={Action.Style.Destructive} onAction={() => stopTimer(id)} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
