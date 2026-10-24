import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { taskit } from "./auth";
import { RequireSignIn } from "./session";
import { TaskListItem, useLists } from "./task-actions";
import { searchTasks } from "./tasks";

export default function Command() {
  return (
    <RequireSignIn>
      <Search />
    </RequireSignIn>
  );
}

function Search() {
  const [query, setQuery] = useState("");
  const lists = useLists();
  const needle = query.trim();
  const tasks = useCachedPromise(
    async (q: string) => {
      const api = await taskit();
      return searchTasks(api, q);
    },
    [needle],
    { execute: needle.length > 0 },
  );

  return (
    <List
      isLoading={tasks.isLoading}
      throttle
      searchBarPlaceholder="Search tasks"
      onSearchTextChange={setQuery}
    >
      {needle.length === 0 ? (
        <List.EmptyView title="Type to search tasks" />
      ) : null}
      {(tasks.data ?? []).map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          lists={lists.data ?? []}
          onChanged={() => void tasks.revalidate()}
        />
      ))}
      {needle.length > 0 &&
      !tasks.isLoading &&
      (tasks.data ?? []).length === 0 ? (
        <List.EmptyView title="No matching tasks" />
      ) : null}
    </List>
  );
}
