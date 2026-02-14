import { List, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTaskLists, type GoogleTaskList } from "./api/tasks";
import ListTasks from "./components/list-tasks";
import CreateList from "./create-list";
import { getErrorMessage } from "./lib/errors";

export default function Lists() {
  const [lists, setLists] = useState<GoogleTaskList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await listTaskLists();
        setLists(data.items || []);
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load lists",
          message: getErrorMessage(err),
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <List
      isLoading={loading}
      navigationTitle="Task Lists"
      searchBarPlaceholder="Search lists..."
    >
      {!loading && lists.length === 0 ? (
        <List.EmptyView
          title="No Lists Yet"
          description="Create a list to get started."
          actions={
            <ActionPanel>
              <Action.Push title="Create List" target={<CreateList />} />
            </ActionPanel>
          }
        />
      ) : null}
      {lists.map((list) => (
        <List.Item
          key={list.id}
          title={list.title}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Tasks"
                target={<ListTasks listId={list.id} listTitle={list.title} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
