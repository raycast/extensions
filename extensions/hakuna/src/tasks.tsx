import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { HakunaClient, ProjectResponse, TaskResponse } from "./hakuna-api";
import { getSettings } from "./settings";
import TimeEntry from "./time-entry";
import Timer from "./timer";

interface TaskItemProps {
  task: TaskResponse;
  projectId?: number;
  enableTimerActions?: boolean;
}

function TaskItem({ task, projectId, enableTimerActions }: TaskItemProps) {
  const hasActions = projectId !== undefined || enableTimerActions;

  const accessories: List.Item.Accessory[] = [];
  if (task.archived) {
    accessories.push({
      tag: { value: "Archived", color: Color.SecondaryText },
    });
  }
  if (task.default) {
    accessories.push({ tag: "Default" });
  }

  return (
    <List.Item
      title={task.name}
      accessories={accessories}
      actions={
        hasActions ? (
          <ActionPanel>
            <Action.Push
              title="Start Timer"
              icon={Icon.Play}
              shortcut={{
                macOS: { modifiers: ["cmd"], key: "t" },
                Windows: { modifiers: ["ctrl"], key: "t" },
              }}
              target={<Timer projectId={projectId} taskId={task.id} />}
            />
            <Action.Push
              title="Add Entry"
              icon={Icon.Plus}
              shortcut={Keyboard.Shortcut.Common.New}
              target={<TimeEntry projectId={projectId} taskId={task.id} />}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function TaskFilterDropdown({
  value,
  onChange,
}: {
  value: "active" | "archived" | "all";
  onChange: (v: "active" | "archived" | "all") => void;
}) {
  return (
    <List.Dropdown
      tooltip="Filter Tasks"
      value={value}
      onChange={(v) => onChange(v as "active" | "archived" | "all")}
    >
      <List.Dropdown.Item title="Active" value="active" />
      <List.Dropdown.Item title="Archived" value="archived" />
      <List.Dropdown.Item title="All" value="all" />
    </List.Dropdown>
  );
}

export function ProjectTasks({ project }: { project: ProjectResponse }) {
  const [filter, setFilter] = useState<"active" | "archived" | "all">("active");

  const tasks = project.tasks.filter((t) => {
    if (filter === "active") return !t.archived;
    if (filter === "archived") return t.archived === true;
    return true;
  });

  return (
    <List
      navigationTitle={project.name}
      searchBarAccessory={
        <TaskFilterDropdown value={filter} onChange={setFilter} />
      }
    >
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} projectId={project.id} />
      ))}
    </List>
  );
}

export default function Command() {
  const { apiToken } = getSettings();
  const [filter, setFilter] = useState<"active" | "archived" | "all">("active");

  const { data, isLoading } = useCachedPromise(
    async (token: string) => {
      const client = new HakunaClient(token);
      const [company, allTasks] = await Promise.all([
        client.getCompany(),
        client.getTasks(),
      ]);
      return { projectsEnabled: company.projects_enabled, tasks: allTasks };
    },
    [apiToken],
    {
      onError: async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load tasks",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      },
    },
  );

  const enableTimerActions = data?.projectsEnabled === false;
  const allTasks = data?.tasks ?? [];
  const tasks = allTasks.filter((t) => {
    if (filter === "active") return !t.archived;
    if (filter === "archived") return t.archived;
    return true;
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Tasks"
      searchBarAccessory={
        <TaskFilterDropdown value={filter} onChange={setFilter} />
      }
    >
      {tasks.map((t) => (
        <TaskItem key={t.id} task={t} enableTimerActions={enableTimerActions} />
      ))}
    </List>
  );
}
