import {
  Action,
  ActionPanel,
  Icon,
  List,
  LocalStorage,
  showToast,
  Toast,
} from "@raycast/api";
import { useCallback, useEffect, useState } from "react";
import toggl from "./api/toggl";

interface TaskItem {
  id: number;
  name: string;
  project: string;
  workspace: string;
  organization: string;
}

export default function Command() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAndCacheTasks = useCallback(async () => {
    setIsLoading(true);
    await showToast({
      style: Toast.Style.Animated,
      title: "Fetching tasks...",
    });
    try {
      const allTasks: TaskItem[] = [];
      const projects = await toggl.getProjects(20090256);
      for (const proj of projects) {
        try {
          const projectTasks = await toggl.getTasks(20090256, proj.id);
          for (const task of projectTasks) {
            allTasks.push({
              id: task.id,
              name: task.name,
              project: proj.name,
              workspace: "", // These would be populated in the full implementation
              organization: "",
            });
          }
        } catch {
          console.error(`Failed to fetch tasks for project ${proj.name}`);
        }
      }
      setTasks(allTasks);
      await LocalStorage.setItem("tasks", JSON.stringify(allTasks));
      await showToast({ style: Toast.Style.Success, title: "Tasks updated" });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch tasks",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadTasks() {
      const cachedTasks = await LocalStorage.getItem<string>("tasks");
      if (cachedTasks) {
        setTasks(JSON.parse(cachedTasks));
        setIsLoading(false);
      } else {
        await fetchAndCacheTasks();
      }
    }
    loadTasks();
  }, [fetchAndCacheTasks]);

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="Refresh"
        icon={Icon.ArrowClockwise}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Refresh"
                onAction={fetchAndCacheTasks}
                shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          title={task.name}
          subtitle={task.project}
          accessories={[{ text: task.workspace }, { tag: task.organization }]}
        />
      ))}
    </List>
  );
}
