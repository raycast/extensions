import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import TaskDetail, { setTaskStatus } from "./task-detail";
import { useActiveProject } from "./preferences";
import { runBacklog } from "./backlog";

interface Task {
  id: string;
  title: string;
  priority: string;
  status: string;
}

const STATUS_ICONS: Record<string, { icon: Icon; color: Color }> = {
  "to do": { icon: Icon.Circle, color: Color.SecondaryText },
  "in progress": { icon: Icon.CircleProgress50, color: Color.Blue },
  done: { icon: Icon.CheckCircle, color: Color.Green },
  blocked: { icon: Icon.XMarkCircle, color: Color.Red },
};

const PRIORITY_TAGS: Record<string, Color> = {
  high: Color.Red,
  medium: Color.Orange,
  low: Color.SecondaryText,
};

const FILTER_OPTIONS = ["All", "To Do", "In Progress", "Done", "Blocked"];
const PRIORITY_FILTERS = ["All", "High", "Medium", "Low"];

function parseTaskList(output: string): Record<string, Task[]> {
  const sections: Record<string, Task[]> = {};
  let currentStatus = "";

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.endsWith(":") && !trimmed.startsWith("[")) {
      currentStatus = trimmed.slice(0, -1);
      sections[currentStatus] = [];
      continue;
    }

    const match = trimmed.match(/^\[(\w+)\]\s+([\w-]+)\s+-\s+(.+)$/);
    if (match && currentStatus) {
      sections[currentStatus] = sections[currentStatus] || [];
      sections[currentStatus].push({
        priority: match[1].toLowerCase(),
        id: match[2],
        title: match[3],
        status: currentStatus,
      });
    }
  }

  return sections;
}

function getEmptyView(sections: Record<string, Task[]>, isLoading: boolean, projectCount: number) {
  if (isLoading) return undefined;

  if (projectCount === 0) {
    return (
      <List.EmptyView title="No project configured" description="Set a Backlog.md project directory in preferences." />
    );
  }

  if (Object.keys(sections).length === 0) {
    return <List.EmptyView title="No tasks found" description="This project does not have any visible tasks." />;
  }

  return undefined;
}

export default function Command() {
  const [activeProject, setActiveProject, config] = useActiveProject();

  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");

  const { isLoading, data, revalidate } = usePromise(
    async (cwd: string, status: string, priority: string) => {
      const args = ["task", "list", "--plain"];
      if (status !== "All") args.push("--status", status.toLowerCase());
      if (priority !== "All") args.push("--priority", priority.toLowerCase());

      const stdout = await runBacklog(args, cwd);
      return parseTaskList(stdout);
    },
    [activeProject, statusFilter, priorityFilter],
    {
      execute: !!activeProject,
      onError: (error) => {
        showToast({ style: Toast.Style.Failure, title: "Failed to list tasks", message: error.message });
      },
    },
  );

  const sections = data || {};
  const emptyView = getEmptyView(sections, isLoading, config.projects.length);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter tasks..."
      searchBarAccessory={
        config.projects.length > 1 ? (
          <List.Dropdown
            tooltip="Switch Project"
            value={activeProject}
            onChange={(val) => {
              setActiveProject(val);
              setStatusFilter("All");
              setPriorityFilter("All");
            }}
          >
            {config.projects.map((p) => (
              <List.Dropdown.Item key={p.path} title={p.name} value={p.path} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {emptyView}
      {Object.entries(sections).map(([status, tasks]) => (
        <List.Section key={status} title={status} subtitle={`${tasks.length}`}>
          {tasks.map((task) => {
            const statusStyle = STATUS_ICONS[status.toLowerCase()] || {
              icon: Icon.Circle,
              color: Color.SecondaryText,
            };
            const priorityColor = PRIORITY_TAGS[task.priority] || Color.SecondaryText;

            return (
              <List.Item
                key={task.id}
                title={task.title}
                subtitle={task.id}
                icon={{ source: statusStyle.icon, tintColor: statusStyle.color }}
                accessories={[{ tag: { value: task.priority, color: priorityColor } }]}
                keywords={[task.id, task.priority, task.status]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Details"
                      icon={Icon.Eye}
                      target={<TaskDetail taskId={task.id} projectDir={activeProject} onRefresh={revalidate} />}
                    />
                    <Action.CopyToClipboard title="Copy Task ID" content={task.id} />
                    <Action
                      title="Refresh"
                      icon={Icon.ArrowClockwise}
                      shortcut={{ modifiers: ["cmd"], key: "r" }}
                      onAction={revalidate}
                    />
                    <ActionPanel.Section title="Set Status">
                      {task.status.toLowerCase() !== "in progress" && (
                        <Action
                          title="Start (in Progress)"
                          icon={Icon.CircleProgress50}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "s" }}
                          onAction={async () => {
                            await setTaskStatus(task.id, "in progress", activeProject);
                            revalidate();
                          }}
                        />
                      )}
                      {task.status.toLowerCase() !== "done" && (
                        <Action
                          title="Complete (Done)"
                          icon={Icon.CheckCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
                          onAction={async () => {
                            await setTaskStatus(task.id, "done", activeProject);
                            revalidate();
                          }}
                        />
                      )}
                      {task.status.toLowerCase() !== "to do" && (
                        <Action
                          title="Move to to Do"
                          icon={Icon.Circle}
                          onAction={async () => {
                            await setTaskStatus(task.id, "to do", activeProject);
                            revalidate();
                          }}
                        />
                      )}
                      {task.status.toLowerCase() !== "blocked" && (
                        <Action
                          title="Mark Blocked"
                          icon={Icon.XMarkCircle}
                          onAction={async () => {
                            await setTaskStatus(task.id, "blocked", activeProject);
                            revalidate();
                          }}
                        />
                      )}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Filter by Status">
                      {FILTER_OPTIONS.map((s) => (
                        <Action
                          key={`status-${s}`}
                          title={`Status: ${s}`}
                          icon={statusFilter === s ? Icon.CheckCircle : Icon.Circle}
                          onAction={() => setStatusFilter(s)}
                        />
                      ))}
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Filter by Priority">
                      {PRIORITY_FILTERS.map((p) => (
                        <Action
                          key={`priority-${p}`}
                          title={`Priority: ${p}`}
                          icon={priorityFilter === p ? Icon.CheckCircle : Icon.Circle}
                          onAction={() => setPriorityFilter(p)}
                        />
                      ))}
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
