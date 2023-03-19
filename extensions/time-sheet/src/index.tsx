import { ActionPanel, List, Icon, LocalStorage, getPreferenceValues, useNavigation } from "@raycast/api";
import { writeFileSync } from "fs";
import moment from "moment";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { useCallback, useEffect, useState } from "react";
import { CreateTaskAction, DeleteTaskAction, EditTaskAction, EmptyView } from "./components";
import { ExportFileAction } from "./components/ExportFileAction";
import { Task } from "./type/Task";

type State = {
  tasks: Array<Task>,
  isLoading: boolean,
}
export type PreferencesType = {
  saveDirectory: string;
};

export function getSaveDirectory(): string {
  let { saveDirectory } = getPreferenceValues();
  console.log()
  saveDirectory = saveDirectory.replace("~", homedir());
  return resolve(saveDirectory);
}

export default function Command() {
  const { pop } = useNavigation();

  const [state, setState] = useState<State>({
    tasks: [],
    isLoading: true,
  })
  useEffect(() => {
    (async () => {
      const storedTasks = await LocalStorage.getItem<string>("tasks");
      if (!storedTasks) {
        setState((previous) => ({ ...previous, isLoading: false }));
        return;
      }

      try {
        const tasks: Task[] = JSON.parse(storedTasks);
        setState((previous) => ({ ...previous, tasks, isLoading: false }));
      } catch (e) {
        // can't decode todos
        setState((previous) => ({ ...previous, tasks: [], isLoading: false }));
      }
    })();
  }, []);
  useEffect(() => {
    setState({ ...state, isLoading: true })
    LocalStorage.setItem("tasks", JSON.stringify(state.tasks));
    setState({ ...state, isLoading: false })

  }, [state.tasks]);

  const handleDelete = useCallback(
    (index: number) => {
      const newTasks = [...state.tasks];
      newTasks.splice(index, 1);
      setState((previous) => ({ ...previous, tasks: newTasks }));
    },
    [state.tasks, setState]
  );


  const handleCreate = useCallback((task: Task) => {
    console.log(task)
    setState({ ...state, tasks: [...state.tasks, task] })
    pop()
  }, [])
  const handleEdit = useCallback((index: number, values: Task) => {
    const newTasks = [...state.tasks];
    newTasks[index] = values;
    setState((previous) => ({ ...previous, tasks: newTasks }));
    pop()
  }, [])

  const handleExport = useCallback(() => {
    const json = JSON.stringify(state.tasks);
    const filename = `${getSaveDirectory()}/${moment().format("DD-MM-YYYY")}_tasks.json`;
    writeFileSync(filename, json, "utf-8");
    setState({ ...state, tasks: [] })
  }, [state.tasks])


  return (
    <List
      isLoading={state.isLoading}
    >
      <EmptyView onCreate={handleCreate} tasks={state.tasks} />
      {
        state.tasks.map((task, index) => (
          <List.Item
            key={index}
            icon={Icon.Checkmark}
            title={task.task}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <EditTaskAction onEdit={handleEdit} task={task} index={index} />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <CreateTaskAction onCreate={handleCreate} />
                  <DeleteTaskAction onDelete={() => handleDelete(index)} />
                  <ExportFileAction onExport={handleExport} />
                </ActionPanel.Section>
              </ActionPanel>
            }
            subtitle={`${task.date}`}
          />
        ))
      }

    </List>
  );
}

