import {
  MenuBarExtra,
  Icon,
  launchCommand,
  LaunchType,
  open,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { fetchTasks } from "./api/client";
import { getCachedTasks } from "./cache";
import { Task } from "./types";

const MAX_VISIBLE_TASKS = 5;

export default function MenuBarTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTasks() {
      try {
        const openTasks = await fetchTasks({ completed: false });
        setTasks(openTasks);
      } catch {
        const cachedTasks = await getCachedTasks();
        if (cachedTasks) {
          const openCachedTasks = cachedTasks.filter(
            (task) => task.status !== "done",
          );
          setTasks(openCachedTasks);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadTasks();
  }, []);

  const taskCount = tasks.length;
  const visibleTasks = tasks.slice(0, MAX_VISIBLE_TASKS);
  const hasMore = taskCount > MAX_VISIBLE_TASKS;
  const title = isLoading ? "…" : taskCount === 0 ? "✓" : String(taskCount);
  const icon = taskCount === 0 ? Icon.CheckCircle : Icon.Circle;

  function openInObsidian(task: Task) {
    const encodedPath = encodeURIComponent(task.path);
    open(`obsidian://open?file=${encodedPath}`);
  }

  function truncateTitle(title: string, maxLength = 40): string {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength - 1) + "…";
  }

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      {taskCount === 0 ? (
        <MenuBarExtra.Item title="All caught up!" icon={Icon.CheckCircle} />
      ) : (
        <>
          {visibleTasks.map((task) => (
            <MenuBarExtra.Item
              key={task.id}
              title={truncateTitle(task.title)}
              icon={Icon.Circle}
              onAction={() => openInObsidian(task)}
            />
          ))}
          {hasMore && (
            <>
              <MenuBarExtra.Separator />
              <MenuBarExtra.Item
                title={`View all ${taskCount} tasks…`}
                icon={Icon.List}
                onAction={async () => {
                  await launchCommand({
                    name: "view-tasks",
                    type: LaunchType.UserInitiated,
                  });
                }}
              />
            </>
          )}
        </>
      )}
      <MenuBarExtra.Separator />
      <MenuBarExtra.Item
        title="Quick Add"
        icon={Icon.Plus}
        onAction={async () => {
          await launchCommand({
            name: "quick-add",
            type: LaunchType.UserInitiated,
          });
        }}
      />
    </MenuBarExtra>
  );
}
