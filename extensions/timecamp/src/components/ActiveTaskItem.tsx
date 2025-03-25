import React, { useEffect } from "react";
import { getPreferenceValues, Icon, List, ActionPanel, Action, Color } from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";

import TimerEntryNoteForm from "./TimeEntryNoteForm.tsx";
import type { ActiveTaskItemProps, Preferences, Task } from "../types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

const ActiveTaskItem = ({ activeTask, setActiveTask, setSelectedItemId }: ActiveTaskItemProps) => {
  const [timer, setTimer] = useCachedState<string>("timer", "00:00:00");
  const { mutate } = useFetch("https://app.timecamp.com/third_party/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: '{"action":"status"}',
    execute: false,
  });

  useEffect(() => {
    const startTimeDate = new Date(activeTask.timer_info ? activeTask.timer_info.start_time : "");

    const interval = setInterval(() => {
      const now = new Date();
      const elapsedTime = now.getTime() - startTimeDate.getTime();

      const seconds = Math.floor((elapsedTime / 1000) % 60);
      const minutes = Math.floor((elapsedTime / (1000 * 60)) % 60);
      const hours = Math.floor((elapsedTime / (1000 * 60 * 60)) % 24);

      const formattedTime = [
        hours.toString().padStart(2, "0"),
        minutes.toString().padStart(2, "0"),
        seconds.toString().padStart(2, "0"),
      ].join(":");

      setTimer(formattedTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask]);

  async function stopTask(task: Task) {
    try {
      await mutate(
        fetch("https://app.timecamp.com/third_party/api/timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "stop", task_id: task.task_id }),
        }),
        {
          shouldRevalidateAfter: false,
          optimisticUpdate() {
            setActiveTask(null);
            setTimer("00:00:00");
            setSelectedItemId("");
          },
          rollbackOnError: true,
        },
      );
    } catch (err) {
      console.error("error stopping task: ", err);
    }
  }

  // ellipse title & subtitle if too long to not overlap the accessories
  let truncated = false;
  let title: string = activeTask.display_name ? activeTask.display_name : activeTask.name;
  let subtitle: string = activeTask.timer_info ? activeTask.timer_info.note : "";
  const subtitleUnchanged: string = subtitle;
  const titleUnchanged: string = title;
  const maxLength = 75;

  if ((title + subtitle).length > maxLength) {
    truncated = true;
    if (title.includes("/")) {
      const splitTitle: string[] = title.split("/");
      title = `${splitTitle[0]}/ ... / ${splitTitle[splitTitle.length - 1]}`;
    }
    subtitle = subtitle.substring(0, maxLength - title.length) + "...";
  }

  return (
    <List.Item
      key={activeTask.task_id}
      id={activeTask.task_id.toString()}
      icon={{ source: Icon.Stop, tintColor: activeTask.color }}
      title={{ value: title, tooltip: truncated ? titleUnchanged : null }}
      subtitle={{ value: subtitle, tooltip: truncated ? subtitleUnchanged : null }}
      accessories={[
        {
          icon: { source: Icon.CommandSymbol, tintColor: Color.Red },
          tag: { value: " + S", color: Color.Red },
        },
        {
          icon: { source: Icon.Clock, tintColor: Color.Green },
          text: { value: timer, color: Color.Green },
        },
      ]}
      actions={
        <ActionPanel title="Active Task">
          <Action.Push
            title="Edit Entry Note"
            target={<TimerEntryNoteForm activeTask={activeTask} setActiveTask={setActiveTask} />}
          />
          <Action title="End Task" onAction={() => stopTask(activeTask)} shortcut={{ modifiers: ["cmd"], key: "s" }} />
        </ActionPanel>
      }
    />
  );
};

export default ActiveTaskItem;
