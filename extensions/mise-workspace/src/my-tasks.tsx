import { Action, ActionPanel, Icon, List, LaunchProps } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";

import type { TaskLite } from "./types";
import { myTasks } from "./api";
import { getAppHost, getConfig } from "./preferences";
import TaskDetail from "./task-detail";
import ManageSubtasks from "./subtasks";
import { formatDue, statusIconFor, subtasksAccessoryFor } from "./ui";

export default function Command(
  props: LaunchProps<{
    launchContext?: { task?: TaskLite; openSubtasks?: boolean };
  }>,
) {
  const [isLoading, setIsLoading] = useState(true);
  const [items, setItems] = useState<TaskLite[]>([]);

  useEffect(() => {
    const cfg = getConfig();
    void (async () => {
      try {
        const resp = await myTasks(cfg);
        setItems(resp);
      } catch {
        /* errors are already toasted by api */
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function refreshMyTasks() {
    try {
      const cfg = getConfig();
      const resp = await myTasks(cfg);
      setItems(resp);
    } catch {
      /* ignore */
    }
  }

  function removeTask(taskId: string) {
    setItems((current) => current.filter((task) => task._id !== taskId));
  }

  const appHost = getAppHost();
  const ctxTask = (props.launchContext as any)?.task as TaskLite | undefined;
  const openSubtasks = Boolean((props.launchContext as any)?.openSubtasks);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) => (Number(b.sortOrder ?? b._creationTime) || 0) - (Number(a.sortOrder ?? a._creationTime) || 0),
      ),
    [items],
  );

  if (ctxTask) {
    if (openSubtasks) {
      return <ManageSubtasks task={ctxTask} onChanged={refreshMyTasks} />;
    }
    return <TaskDetail task={ctxTask} appHost={appHost} __openSubtasks={openSubtasks} />;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search my tasks">
      {sorted.map((t) => (
        <List.Item
          key={t._id}
          icon={statusIconFor(t)}
          title={t.title}
          subtitle={formatDue(t.dueDate)}
          accessories={
            [
              subtasksAccessoryFor(t),
              t.projectName ? { tag: { value: t.projectName, color: "gray" } } : undefined,
            ].filter(Boolean) as any
          }
          actions={
            <ActionPanel>
              <Action.Push
                title="Open Task"
                icon={Icon.Checkmark}
                target={<TaskDetail task={t} appHost={appHost} onUpdated={refreshMyTasks} onDeleted={removeTask} />}
              />
              {t.hasSubtasks ? (
                <Action.Push
                  title="Manage Subtasks"
                  icon={Icon.CheckList}
                  target={<ManageSubtasks task={t} onChanged={refreshMyTasks} />}
                />
              ) : null}
              <Action.OpenInBrowser icon={Icon.Globe} title="Open in Browser" url={`${appHost}/task/${t._id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
