import React, { useState, useEffect } from "react";
import {
  useNavigation,
  getPreferenceValues,
  closeMainWindow,
  Icon,
  List,
  ActionPanel,
  Action,
  Color,
  Form,
} from "@raycast/api";
import { useFetch, useCachedState } from "@raycast/utils";
import fetch from "node-fetch";

interface TasksResponse {
  [key: string]: Task;
}

type Task = {
  task_id: number | string;
  name: string;
  parent_id: number | string;
  hasChildren?: boolean;
  level: number | string;
  display_name?: string;
  color?: string;
  timer_info?: TimerInfo;
  breadcrumb?: Crumb[];
};

type Crumb = {
  task_id: number | string;
  name: string;
};

type TimerInfo = {
  isTimerRunning: boolean;
  elapsed: number | string;
  entry_id: number | string;
  timer_id: number | string;
  task_id: number | string;
  start_time: string;
  name: string;
  note: string;
  browser_plugin_button_hash?: string;
};

type TimerEntryNoteFormProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
};

type FormData = {
  note: string;
};

interface Preferences {
  timecamp_api_token: string;
}

const preferences = getPreferenceValues<Preferences>();
const token = preferences.timecamp_api_token;

function TimerEntryNoteForm({ activeTask, setActiveTask }: TimerEntryNoteFormProps) {
  const { mutate } = useFetch("https://app.timecamp.com/third_party/api/entries", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    execute: false,
  });
  const { pop } = useNavigation();

  const updateNote = async (entryId: number | string, noteString: string, close: boolean) => {
    try {
      await mutate(
        fetch("https://app.timecamp.com/third_party/api/entries", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: entryId, note: noteString }),
        }),
        {
          async optimisticUpdate() {
            const tempTask = activeTask;
            if (tempTask.timer_info) {
              tempTask.timer_info.note = noteString;
            }
            setActiveTask(tempTask);
            pop();
            if (close) {
              await closeMainWindow({ clearRootSearch: true });
            }
          },
          rollbackOnError: true,
          shouldRevalidateAfter: false,
        },
      );
    } catch (err) {
      console.error("error updating task: ", err);
    }
  };

  return (
    <Form
      navigationTitle="Edit Entry"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Save Edits & Close Window"
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values.note, true)
            }
          />
          <Action.SubmitForm
            title="Save Edits"
            shortcut={{ modifiers: ["cmd"], key: "s" }}
            onSubmit={(values: FormData) =>
              updateNote(activeTask.timer_info ? activeTask.timer_info.entry_id : "", values.note, false)
            }
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="note"
        title="Note"
        placeholder="Enter task note"
        autoFocus={true}
        defaultValue={activeTask.timer_info?.note}
      />
    </Form>
  );
}

type ActiveTaskItemProps = {
  activeTask: Task;
  setActiveTask: (task: Task | null) => void;
  setSelectedItemId: (itemId: string) => void;
};
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

  return (
    <List.Item
      key={activeTask.task_id}
      id={activeTask.task_id.toString()}
      icon={{ source: Icon.Stop, tintColor: activeTask.color }}
      title={activeTask.display_name ? activeTask.display_name : activeTask.name}
      subtitle={activeTask.timer_info ? activeTask.timer_info.note : ""}
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
    } catch (err) {
      console.error("error starting task: ", err);
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
      <List.Section title="Tasks">
        {(tasks || []).map((task: Task) => {
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
