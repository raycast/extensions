import { List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listTaskLists, listTasks, GoogleTask } from "./api/tasks";
import { getErrorMessage } from "./lib/errors";

export default function Today() {
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const lists = await listTaskLists();
        const today = new Date().toISOString().slice(0, 10);

        const results = await Promise.all(
          (lists.items || []).map((l) => listTasks(l.id)),
        );

        const allTasks = results
          .flatMap((r) => r.items || [])
          .filter(
            (t) =>
              t.due && t.due.slice(0, 10) === today && t.status !== "completed",
          )
          .sort((a, b) => {
            const da = a.due ? new Date(a.due).getTime() : Infinity;
            const db = b.due ? new Date(b.due).getTime() : Infinity;
            return da - db;
          });

        if (!cancelled) {
          setTasks(allTasks);
        }
      } catch (err) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: getErrorMessage(err),
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <List
      isLoading={loading}
      navigationTitle="Today's Tasks"
      searchBarPlaceholder="Search today's tasks..."
    >
      {!loading && tasks.length === 0 ? (
        <List.EmptyView
          title="No Tasks Due Today"
          description="Enjoy your clear schedule."
        />
      ) : null}
      {tasks.map((t) => (
        <List.Item
          key={t.id}
          title={t.title}
          subtitle={t.due ? new Date(t.due).toDateString() : undefined}
        />
      ))}
    </List>
  );
}
