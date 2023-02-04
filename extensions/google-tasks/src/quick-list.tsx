import { List, Toast, showToast } from "@raycast/api";
import { useState, useEffect, useCallback } from "react";
import * as google from "./api/oauth";

import TaskItem from "./components/TaskItem";
import EmptyView from "./components/EmtpyView";

import {
  createTask,
  deleteTask,
  editTask,
  fetchList,
  getCachedTasksByListId,
  getDefaultList,
  toggleTask,
} from "./api/endpoints";
import { Filter, Task, TaskForm } from "./types";
import { isCompleted } from "./utils";

type State = {
  filter: Filter;
  isLoading: boolean;
  searchText: string;
  tasklist: string;
  tasks: Task[];
};

export default function Command() {
  const [{ filter, isLoading, searchText, tasklist, tasks }, setState] = useState<State>({
    filter: Filter.Open,
    isLoading: true,
    searchText: "",
    tasklist: "",
    tasks: [],
  });

  useEffect(() => {
    const setup = async () => {
      try {
        await google.authorize();
        const tasklist = await getDefaultList();
        const tasks = getCachedTasksByListId(tasklist.id);
        setState((previous) => ({
          ...previous,
          tasklist: tasklist.id,
          tasks,
        }));

        fetchList(tasklist.id).then((tasks) => {
          setState((previous) => ({
            ...previous,
            tasks,
            isLoading: false,
          }));
        });
      } catch (error) {
        console.error(error);
        setState((previous) => ({ ...previous, tasks: [], isLoading: false }));
        showToast({ style: Toast.Style.Failure, title: String(error) });
      }
    };

    setup();
  }, [google]);

  const handleCreate = useCallback(
    (listId: string, taskToCreate: TaskForm) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));
          await createTask(tasklist, taskToCreate);
          const refreshedList = await fetchList(tasklist);
          setState((previous) => ({
            ...previous,
            tasks: refreshedList,
            isLoading: false,
          }));
        } catch (error) {
          console.error(error);
          setState((previous) => ({
            ...previous,
            tasks: [],
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      })();
    },
    [tasks, setState]
  );
  const handleEdit = useCallback(
    (listId: string, taskToEdit: Task) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));
          await editTask(tasklist, taskToEdit);
          const refreshedList = await fetchList(tasklist);
          setState((previous) => ({
            ...previous,
            tasks: refreshedList,
            isLoading: false,
          }));
        } catch (error) {
          console.error(error);
          setState((previous) => ({
            ...previous,
            tasks: [],
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      })();
    },
    [tasks, setState]
  );

  const handleToggle = useCallback(
    (taskToToggle: Task) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));
          await toggleTask(tasklist, taskToToggle);
          const refreshedList = await fetchList(tasklist);
          setState((previous) => ({
            ...previous,
            tasks: refreshedList,
            isLoading: false,
          }));
        } catch (error) {
          console.error(error);
          setState((previous) => ({
            ...previous,
            tasks: [],
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      })();
    },
    [tasks, setState]
  );

  const handleDelete = useCallback(
    (taskToDelete: Task) => {
      (async () => {
        try {
          setState((previous) => ({ ...previous, isLoading: true }));
          await deleteTask(tasklist, taskToDelete.id);
          const refreshedList = await fetchList(tasklist);
          setState((previous) => ({
            ...previous,
            tasks: refreshedList,
            isLoading: false,
          }));
        } catch (error) {
          console.error(error);
          setState((previous) => ({
            ...previous,
            tasks: [],
            isLoading: false,
          }));
          showToast({ style: Toast.Style.Failure, title: String(error) });
        }
      })();
    },
    [tasks, setState]
  );

  const filterTasks = useCallback(() => {
    if (filter === Filter.Open) {
      return tasks.filter((task) => !isCompleted(task));
    }
    if (filter === Filter.Completed) {
      return tasks.filter((task) => isCompleted(task));
    }
    return tasks;
  }, [tasks, filter]);

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchText={searchText}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Tasks..."
          value={filter}
          onChange={(newValue) =>
            setState((previous) => ({
              ...previous,
              filter: newValue as Filter,
            }))
          }
        >
          <List.Dropdown.Item title="All" value={Filter.All} />
          <List.Dropdown.Item title="Open" value={Filter.Open} />
          <List.Dropdown.Item title="Completed" value={Filter.Completed} />
        </List.Dropdown>
      }
      enableFiltering
      onSearchTextChange={(newValue) => {
        setState((previous) => ({ ...previous, searchText: newValue }));
      }}
    >
      {filterTasks().map((task) => {
        return (
          <TaskItem
            key={task.id}
            listId={tasklist}
            tasks={tasks}
            task={task}
            onToggle={() => handleToggle(task)}
            onDelete={() => handleDelete(task)}
            onCreate={handleCreate}
            onEdit={handleEdit}
          />
        );
      })}
      <EmptyView
        listId={tasklist}
        tasks={filterTasks()}
        filter={filter}
        searchText={searchText}
        onCreate={handleCreate}
      />
    </List>
  );
}
