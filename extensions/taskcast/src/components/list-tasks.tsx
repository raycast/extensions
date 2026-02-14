import { List, ActionPanel, Action } from "@raycast/api";
import { useEffect, useState } from "react";
import { completeTask, GoogleTask, listTasks } from "../api/tasks";
import { priorityRank } from "../lib/priority";
import { Toast, showToast } from "@raycast/api";
import { getErrorMessage } from "../lib/errors";

type Props = {
  listId: string;
  listTitle: string;
};

export default function ListTasks({ listId, listTitle }: Props) {
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await listTasks(listId);
        const items = (res.items || []).filter(
          (t: GoogleTask) => t.status !== "completed",
        );

        items.sort((a: GoogleTask, b: GoogleTask) => {
          const pr = priorityRank(a.title) - priorityRank(b.title);
          if (pr !== 0) return pr;

          const da = a.due ? new Date(a.due).getTime() : Infinity;
          const db = b.due ? new Date(b.due).getTime() : Infinity;
          return da - db;
        });

        setTasks(items);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: getErrorMessage(error),
        });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [listId]);

  async function onCompleteTask(task: GoogleTask) {
    // optimistic UI
    setTasks((prev) => prev.filter((t) => t.id !== task.id));

    try {
      await completeTask(listId, task.id);

      await showToast({
        style: Toast.Style.Success,
        title: "Task completed",
      });
    } catch (e) {
      // rollback on failure
      setTasks((prev) => [task, ...prev]);

      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to complete task",
        message: getErrorMessage(e),
      });
    }
  }
  return (
    <List
      isLoading={loading}
      navigationTitle={listTitle}
      searchBarPlaceholder="Search tasks..."
    >
      {!loading && tasks.length === 0 ? (
        <List.EmptyView
          title="No Open Tasks"
          description="All tasks in this list are complete."
        />
      ) : null}
      {tasks.map((t) => (
        <List.Item
          key={t.id}
          title={t.title}
          keywords={[t.title]}
          subtitle={t.due ? new Date(t.due).toDateString() : undefined}
          actions={
            <ActionPanel>
              <Action
                title="Mark Complete"
                onAction={() => onCompleteTask(t)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
