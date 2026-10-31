import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { taskit } from "./auth";
import { RequireSignIn } from "./session";
import { TaskListItem, useLists } from "./task-actions";
import { listTasks, type TaskView, VIEWS } from "./tasks";

const VIEW_LABEL: Record<TaskView, string> = {
  today: "Today",
  inbox: "Inbox",
  upcoming: "Upcoming",
  overdue: "Overdue",
  backlog: "Backlog",
};

export default function Command() {
  return (
    <RequireSignIn>
      <TaskBrowser />
    </RequireSignIn>
  );
}

function TaskBrowser() {
  const [view, setView] = useState<TaskView>("today");
  const lists = useLists();
  const tasks = useCachedPromise(
    async (selected: TaskView) => {
      const api = await taskit();
      return listTasks(api, { view: selected });
    },
    [view],
  );

  return (
    <List
      isLoading={tasks.isLoading}
      searchBarPlaceholder="Filter tasks"
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={view}
          onChange={(next) => setView(next as TaskView)}
        >
          {VIEWS.map((item) => (
            <List.Dropdown.Item
              key={item}
              title={VIEW_LABEL[item]}
              value={item}
            />
          ))}
        </List.Dropdown>
      }
    >
      {(tasks.data ?? []).map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          lists={lists.data ?? []}
          view={view}
          onChanged={() => void tasks.revalidate()}
        />
      ))}
      {!tasks.isLoading && (tasks.data ?? []).length === 0 ? (
        <List.EmptyView title={`Nothing in ${VIEW_LABEL[view]}`} />
      ) : null}
    </List>
  );
}
