import React from "react";
import { Action, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { STATUS_GROUPS } from "@today/common/types";

import AddDatabase from "./addDatabase";
import { notionService } from "./utils/authNotion";
import { TasksList } from "./components/TasksList";

import { withStoreProvider } from "./components/StoreProvider";
import { useStore } from "@today/common/components/StoreContext";
import { TaskItem } from "./components/TaskItem";
import { AutoCompleteList } from "./components/AutoCompleteList";
import { useAddNewTask, useTasks, useView } from "@today/common";

function Index() {
  const { config = {}, selectedItem } = useStore();
  const { query: searchText, setQuery: setSearchText, autocompletes, newTask, createTask } = useAddNewTask();
  const { isLoading } = useView();

  const { tasksByStatus } = useTasks({
    query: searchText,
  });

  if (!Object.keys(config).length) {
    return <AddDatabase />;
  }

  return (
    <List
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search or add a new task"
      selectedItemId={selectedItem}
    >
      {searchText && (
        <List.Section title={"Add new task"}>
          <TaskItem
            task={newTask}
            actions={
              <>
                <Action title="Add Task" onAction={createTask} />
              </>
            }
          />
        </List.Section>
      )}
      <AutoCompleteList autocompletes={autocompletes} />
      <TasksList title="In progress" tasks={tasksByStatus[STATUS_GROUPS.Progress]} />
      <TasksList title="To-do" tasks={tasksByStatus[STATUS_GROUPS.Todo]} />
      <TasksList title="Complete" tasks={tasksByStatus[STATUS_GROUPS.Complete]} />
    </List>
  );
}

export default withStoreProvider(withAccessToken(notionService)(Index));
