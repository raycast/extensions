import React, { useState, useEffect } from "react";
import { useNavigation, getPreferenceValues, showToast, Toast, Icon, List, ActionPanel, Action } from "@raycast/api";
import { useFetch, useCachedState, useFrecencySorting } from "@raycast/utils";
import fetch from "node-fetch";
import ActiveTaskItem from "./components/ActiveTaskItem.tsx";
import TimerEntryNoteForm from "./components/TimeEntryNoteForm.tsx";
import RecentEntries from "./components/RecentEntries.tsx";
import type { Task, Preferences, TimerInfo, TasksResponse } from "./types.ts";

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

export default function Command() {
  const [tasks, setTasks] = useCachedState<Task[]>("tasks", []);
  const [activeTask, setActiveTask] = useCachedState<Task | null>("activeTask", null);
  const [selectedItemId, setSelectedItemId] = useCachedState<string>("selectedItemId", "");
  const [startedTask, setStartedTask] = useState(false);
  const { push } = useNavigation();
  const { isLoading } = useFetch("https://app.timecamp.com/third_party/api/tasks?status=active", {
    method: "GET",
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    keepPreviousData: true,
    initialData: tasks,
    onData: curateTasks,
  });
  const { mutate: mutateActiveTask } = useFetch("https://app.timecamp.com/third_party/api/timer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: '{"action":"status"}',
    keepPreviousData: true,
    initialData: activeTask,
    onData: getActiveTask,
  });
  const { data: sortedTasks, visitItem: visitTask } = useFrecencySorting(tasks, {
    namespace: "tasks",
    key: (task: Task) => task.task_id.toString(),
  });

  useEffect(() => {
    if (activeTask && startedTask) {
      push(<TimerEntryNoteForm activeTask={activeTask} setActiveTask={setActiveTask} />);
      setStartedTask(false); // Reset the flag
    }
  }, [activeTask, startedTask]);

  function curateTasks(data: TasksResponse) {
    const filteredData: Task[] = [];

    // find the last level of every task and build the heirchy in the task.display_name
    const processChildTasks = (parentTaskId: string | number, displayName: string) => {
      for (const key in data) {
        const task = data[key];
        if (task.name.includes("ARCHIVED")) continue;

        if (task.parent_id == parentTaskId) {
          const newDisplayName = displayName ? `${displayName} / ${task.name}` : task.name;
          if (task.hasChildren) {
            processChildTasks(task.task_id, newDisplayName);
          } else {
            task.display_name = newDisplayName;
            filteredData.push(task);
          }
        }
      }
    };

    for (const key in data) {
      const task = data[key];
      if (task.name.includes("ARCHIVED")) continue;

      if (task.level == 1) {
        if (task.hasChildren) {
          processChildTasks(task.task_id, task.name);
        } else {
          task.display_name = task.name;
          filteredData.push(task);
        }
      }
    }
    setTasks(filteredData);
  }

  async function startTask(task: Task, editNote: boolean) {
    setActiveTask(null);
    setStartedTask(false);
    visitTask(task);

    try {
      await mutateActiveTask(
        fetch("https://app.timecamp.com/third_party/api/timer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action: "start", task_id: task.task_id }),
        }),
        {
          shouldRevalidateAfter: true,
        },
      );
      if (editNote) {
        setStartedTask(true);
      }
      await showToast({
        style: Toast.Style.Success,
        title: "⏳ Task Started",
      });
    } catch (err) {
      console.error("error starting task: ", err);
      await showToast({
        style: Toast.Style.Failure,
        title: "❌ Error starting task",
      });
    }
  }

  function getActiveTask(data: TimerInfo) {
    if (data) {
      if (data.isTimerRunning) {
        const findTask = tasks.find((task: Task) => task.task_id == data.task_id);
        if (findTask) {
          findTask.timer_info = data;
          setActiveTask(findTask);
          setSelectedItemId(findTask.task_id.toString());
        }
      } else if (!data.isTimerRunning) {
        setActiveTask(null);
        setSelectedItemId("");
      }
    }
  }

  return (
    <List
      isLoading={isLoading}
      filtering={{ keepSectionOrder: true }}
      selectedItemId={selectedItemId}
      searchBarPlaceholder="Search Task"
    >
      {activeTask ? (
        <List.Section title="Active Timer">
          <ActiveTaskItem activeTask={activeTask} setActiveTask={setActiveTask} setSelectedItemId={setSelectedItemId} />
        </List.Section>
      ) : null}

      <RecentEntries />

      <List.Section title="Tasks">
        {(sortedTasks || []).map((task: Task) => {
          if (activeTask && activeTask.task_id == task.task_id) return null;

          return (
            <List.Item
              key={task.task_id}
              id={task.task_id.toString()}
              icon={{ source: Icon.Dot, tintColor: task.color }}
              title={task.display_name ? task.display_name : task.name}
              actions={
                <ActionPanel title="Inactive Task">
                  <Action title="Start Task & Edit Note" onAction={() => startTask(task, true)} />
                  <Action
                    title="Start Task"
                    onAction={() => startTask(task, false)}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
