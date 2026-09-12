import React, { useState } from "react";
import { getPreferenceValues, showHUD, showToast, Toast, Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";
import type { Task, Preferences, TimerInfo, Entry } from "../types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

function RecentEntries() {
  const [tasks] = useCachedState<Task[]>("tasks", []);
  const [, setActiveTask] = useCachedState<Task | null>("activeTask", null);
  const [recentEntries, setRecentEntries] = useCachedState<Entry[]>("recentEntries", []);
  const [selectedNote, setSelectedNote] = useState("");
  const [postClose, setPostClose] = useState(false);
  useFetch(
    `https://app.timecamp.com/third_party/api/entries?from=${getDateWindow().startDate}&to=${getDateWindow().endDate}&opt_fields=breadcrumps&include_project=true`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      initialData: recentEntries,
      onData: initRecentEntries,
    },
  );
  const { mutate: mutateTimer } = useFetch("https://app.timecamp.com/third_party/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: '{"action":"status"}',
    execute: false,
    onData: updateNote,
  });
  const { mutate: mutateEntry } = useFetch("https://app.timecamp.com/third_party/api/entries", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    execute: false,
  });

  async function updateNote(data: TimerInfo) {
    try {
      await mutateEntry(
        fetch("https://app.timecamp.com/third_party/api/entries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: data.entry_id, note: selectedNote }),
        }),
        {
          async optimisticUpdate() {
            const tempTask: Task | undefined = tasks.find((task: Task) => task.task_id == data.task_id);
            if (tempTask) {
              tempTask.timer_info = data;
              tempTask.timer_info.note = selectedNote;
              setActiveTask(tempTask);
            }

            if (postClose) {
              await showHUD("✅ Entry Resumed", { clearRootSearch: true });
            } else {
              await showToast({
                style: Toast.Style.Success,
                title: "✅ Entry Resumed",
              });
            }

            setSelectedNote("");
            setPostClose(false);
          },
          rollbackOnError: true,
          shouldRevalidateAfter: false,
        },
      );
    } catch (err) {
      console.error("error updating task: ", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error saving the entry",
      });
    }
  }

  async function startTimer(entry: Entry, close: boolean) {
    setSelectedNote(entry.description);
    setPostClose(close);
    try {
      await mutateTimer(
        fetch("https://app.timecamp.com/third_party/api/timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "start", task_id: entry.task_id }),
        }),
        {
          shouldRevalidateAfter: true,
        },
      );
      await showToast({
        style: Toast.Style.Success,
        title: "⏳ Task Started",
      });
    } catch (err) {
      console.error("error starting task: ", err);
      setSelectedNote("");
      setPostClose(false);
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error starting task",
      });
    }
  }

  function initRecentEntries(data: Entry[]) {
    data.reverse();
    const curatedData: Entry[] = [];
    for (let i = 0; i < data.length; i++) {
      const entry: Entry = data[i];
      if (!curatedData.find((item: Entry) => item.description === entry.description)) {
        curatedData.push(entry);
      }

      if (curatedData.length >= 4) break;
    }
    setRecentEntries(curatedData);
  }

  function getDateWindow() {
    const endDate = new Date();
    const startDate = new Date();

    // Set start date to 30 days before
    startDate.setDate(startDate.getDate() - 30);

    // Format dates to YYYY-MM-DD
    const format = (date: Date) => date.toISOString().split("T")[0];

    return {
      startDate: format(startDate),
      endDate: format(endDate),
    };
  }

  return recentEntries.length > 0 ? (
    <List.Section title="Recent">
      {(recentEntries || []).map((entry: Entry) => {
        const title: string = entry.breadcrumps ? `${entry.breadcrumps} / ${entry.name}` : entry.name;
        const subtitle: string = entry.description;

        return (
          <List.Item
            key={"entry-" + entry.id}
            id={"entry-" + entry.id.toString()}
            icon={{ source: Icon.Dot, tintColor: entry.color }}
            title={title}
            subtitle={subtitle}
            actions={
              <ActionPanel title="Recent Entries">
                <Action title="Resume Task & Close Window" onAction={() => startTimer(entry, true)} />
                <Action
                  title="Resume Task"
                  onAction={() => startTimer(entry, false)}
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  ) : null;
}

export default RecentEntries;
