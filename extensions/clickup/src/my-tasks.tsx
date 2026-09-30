import { List, Icon, Color, ActionPanel, Action, openExtensionPreferences } from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { useMemo, useState } from "react";
import { TasksProvider, useTasksContext } from "./contexts/TasksContext";
import { MyTasksScope, useMyTasks } from "./hooks/useMyTasks";
import { ClickUpTask } from "./types/clickup";
import { flattenTasksWithDepthAndContext } from "./utils/task-helpers";
import { buildTaskAccessories, buildSubtitle } from "./utils/format-helpers";
import { hasSubtasks, countSubtasks, getParentTask, isSubtask } from "./utils/task-helpers";
import { CopyBody, CopyId, CopyMarkdownUrl, CopyUrl } from "./components/actions/CopyActions";
import { ShowTaskDetails, GoToParentTask, ShowSubtasks } from "./components/actions/NavigationActions";
import { OpenInClickUpAction } from "./components/OpenInClickUpAction";
import { NextStatus, ChangeStatus } from "./components/actions/StatusActions";
import { Shortcuts } from "./constants/shortcuts";

const SCOPE_TITLES: Record<MyTasksScope, string> = { list: "Default List", workspace: "Entire Workspace" };

export default function MyTasks() {
  const [scope, setScope] = useState<MyTasksScope>("list");
  const [dueDateOnly, setDueDateOnly] = useCachedState("my-tasks-due-date-only", false);
  const { assignedTaskIds, error, isLoading, tasks, userName } = useMyTasks(scope, dueDateOnly);

  const scopeTitle = SCOPE_TITLES[scope];
  const scopeDropdown = (
    <List.Dropdown onChange={(value) => setScope(value as MyTasksScope)} storeValue tooltip="Scope">
      <List.Dropdown.Item title={SCOPE_TITLES.list} value="list" />
      <List.Dropdown.Item title={SCOPE_TITLES.workspace} value="workspace" />
    </List.Dropdown>
  );
  const dueDateFilterAction = (
    <Action
      icon={dueDateOnly ? Icon.List : Icon.Calendar}
      onAction={() => setDueDateOnly(!dueDateOnly)}
      shortcut={Shortcuts.ToggleDueDateFilter}
      title={dueDateOnly ? "Show All Open Tasks" : "Show Only Tasks with Due Date"}
    />
  );

  const tasksWithContext = useMemo(
    () => flattenTasksWithDepthAndContext(tasks, assignedTaskIds),
    [tasks, assignedTaskIds],
  );

  if (error && !isLoading && tasks.length === 0) {
    return (
      <List searchBarAccessory={scopeDropdown}>
        <List.EmptyView
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} onAction={openExtensionPreferences} title="Open Extension Preferences" />
              {dueDateFilterAction}
            </ActionPanel>
          }
          description={error.message}
          icon={Icon.ExclamationMark}
          title="Failed to load tasks"
        />
      </List>
    );
  }

  return (
    <TasksProvider tasks={tasks}>
      <List
        isLoading={isLoading}
        navigationTitle={`${userName ? `My Tasks - ${userName}` : "My Tasks"} (${scopeTitle}${dueDateOnly ? ", With Due Date" : ""})`}
        searchBarAccessory={scopeDropdown}
      >
        {tasks.length === 0 && !isLoading && (
          <List.EmptyView
            actions={<ActionPanel>{dueDateFilterAction}</ActionPanel>}
            description={
              dueDateOnly
                ? `None of your open tasks in the ${scopeTitle} have a due date`
                : `You don't have any tasks assigned to you in the ${scopeTitle}`
            }
            icon={Icon.CheckCircle}
            title={dueDateOnly ? "No tasks with a due date assigned to you" : "No tasks assigned to you"}
          />
        )}
        {tasksWithContext.map(({ depth, isAssignedToUser, task }) => (
          <TaskListItem
            depth={depth}
            dueDateFilterAction={dueDateFilterAction}
            isAssignedToUser={isAssignedToUser}
            key={task.id}
            task={task}
          />
        ))}
      </List>
    </TasksProvider>
  );
}

interface TaskListItemProps {
  depth?: number;
  dueDateFilterAction: React.ReactNode;
  isAssignedToUser?: boolean;
  task: ClickUpTask;
}

function TaskListItem({ depth = 0, dueDateFilterAction, isAssignedToUser = true, task }: TaskListItemProps) {
  const { tasks: allTasks } = useTasksContext();
  const isSubTask = isSubtask(task);
  const parentTask = isSubTask ? getParentTask(task, allTasks) : undefined;
  const subtaskCount = hasSubtasks(task, allTasks) ? countSubtasks(task, allTasks) : 0;
  const accessories = buildTaskAccessories(task);
  const subtitle = buildSubtitle(subtaskCount);
  const markdownUrl = `[${task.name}](${task.url})`;

  const keywords = [
    ...(task.watchers ? task.watchers.map((w) => w.username) : []),
    ...task.assignees.map((a) => a.username),
    ...task.tags.map((t) => t.name),
    task.creator.username,
    task.name,
    task.priority?.priority || "",
    task.status.status,
  ].filter(Boolean);

  const iconValue =
    depth === 0
      ? task.priority
        ? {
            source: Icon.Flag,
            tintColor: isAssignedToUser ? task.priority.color : Color.SecondaryText,
          }
        : undefined
      : depth === 1
        ? { source: Icon.Minus, tintColor: Color.SecondaryText }
        : { source: Icon.ChevronRight, tintColor: Color.SecondaryText };

  const indentation = "  ".repeat(depth);
  const displayTitle = `${indentation}${task.name}`;

  let markdown = `# ${task.name}`;
  if (task.description) {
    markdown += `\n\n${task.description}`;
  }

  return (
    <List.Item
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Navigation">
            <ShowTaskDetails task={task} />
            {isSubTask && parentTask && <GoToParentTask task={parentTask} />}
            {subtaskCount > 0 && <ShowSubtasks task={task} />}
            <OpenInClickUpAction route={task.url} override />
          </ActionPanel.Section>
          <ActionPanel.Section title="Status">
            <NextStatus task={task} />
            <ChangeStatus task={task} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyBody content={markdown} />
            <CopyMarkdownUrl url={markdownUrl} />
            <CopyUrl url={task.url} />
            <CopyId id={task.id} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Filter">{dueDateFilterAction}</ActionPanel.Section>
        </ActionPanel>
      }
      icon={iconValue}
      keywords={keywords}
      subtitle={subtitle}
      title={displayTitle}
    />
  );
}
