import {
  Action,
  ActionPanel,
  Color,
  Icon,
  List,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Tasks } from "./api/resources";
import { useSpaces } from "./hooks/useLookups";
import {
  formatDate,
  indexByName,
  priorityColor,
  priorityLabel,
  showKyoError,
  taskStatusIcon,
} from "./lib/helpers";
import { EditTaskForm } from "./components/EditTaskForm";
import { CommentsList } from "./components/DealComments";
import CreateTask from "./create-task";
import { LogOutAction } from "./components/AuthActions";

type Filter = "open" | "completed" | "all";

export default function SearchTasks() {
  const [filter, setFilter] = useState<Filter>("open");
  const [spaceId, setSpaceId] = useState<string>("");

  const { data: spaces } = useSpaces();
  const spaceNames = indexByName(spaces);

  const {
    data: tasks,
    isLoading,
    revalidate,
  } = useCachedPromise(
    (f: Filter, sid: string) => {
      const query: Record<string, string | boolean> = {};
      if (f === "open") query.completed = false;
      if (f === "completed") query.completed = true;
      if (sid) query.space_id = sid;
      return Tasks.list(query);
    },
    [filter, spaceId],
    { initialData: [] },
  );

  async function toggle(id: string, completed: boolean) {
    try {
      await Tasks.update(id, { completed: !completed });
      await showToast({
        style: Toast.Style.Success,
        title: !completed ? "Task completed" : "Task reopened",
      });
      revalidate();
    } catch (error) {
      await showKyoError(error, "Failed to update task");
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks by name…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter tasks"
          value={`${filter}|${spaceId}`}
          onChange={(v) => {
            const [f, s] = v.split("|");
            setFilter(f as Filter);
            setSpaceId(s ?? "");
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item title="Open" value="open|" />
            <List.Dropdown.Item title="Completed" value="completed|" />
            <List.Dropdown.Item title="All" value="all|" />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Space (open)">
            {spaces.map((s) => (
              <List.Dropdown.Item
                key={s.id}
                title={s.name}
                value={`open|${s.id}`}
              />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No tasks"
        icon={Icon.CheckCircle}
        actions={
          <ActionPanel>
            <Action.Push
              title="Create Task"
              icon={Icon.Plus}
              target={<CreateTask />}
              onPop={revalidate}
            />
          </ActionPanel>
        }
      />
      {tasks.map((task) => (
        <List.Item
          key={task.id}
          icon={taskStatusIcon(task.completed)}
          title={task.name}
          accessories={[
            task.is_private
              ? {
                  icon: { source: Icon.Lock, tintColor: Color.SecondaryText },
                  tooltip: "Private",
                }
              : {},
            task.priority
              ? {
                  tag: {
                    value: priorityLabel(task.priority),
                    color: priorityColor(task.priority),
                  },
                }
              : {},
            task.space_id && spaceNames.get(task.space_id)
              ? { text: spaceNames.get(task.space_id) }
              : {},
            task.due_date
              ? {
                  date: new Date(task.due_date),
                  tooltip: `Due ${formatDate(task.due_date)}`,
                }
              : {},
          ]}
          actions={
            <ActionPanel>
              <Action
                title={task.completed ? "Reopen Task" : "Complete Task"}
                icon={task.completed ? Icon.Circle : Icon.CheckCircle}
                onAction={() => toggle(task.id, task.completed ?? false)}
              />
              <Action.Push
                title="Edit Task"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "e" }}
                target={<EditTaskForm task={task} onSaved={revalidate} />}
              />
              <Action.Push
                title="View Comments"
                icon={Icon.SpeechBubble}
                shortcut={{ modifiers: ["cmd"], key: "m" }}
                target={
                  <CommentsList
                    entityType="task"
                    entityId={task.id}
                    title={task.name}
                  />
                }
              />
              <ActionPanel.Section>
                <Action.Push
                  title="Create Task"
                  icon={Icon.Plus}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  target={<CreateTask />}
                  onPop={revalidate}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                />
                <LogOutAction />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
