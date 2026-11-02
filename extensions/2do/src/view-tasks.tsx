import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { List as TwoDoList, scopeArgs, SmartList, Task, twoDo } from "./2do";
import { TaskForm } from "./task-form";

const FOCUSES = [
  ["all", "All", Icon.Tray],
  ["today", "Today", Icon.Calendar],
  ["starred", "Starred", Icon.Star],
  ["scheduled", "Scheduled", Icon.Clock],
  ["done", "Done", Icon.CheckCircle],
] as const;

const PRIORITY_TAGS = {
  high: { value: "High", color: Color.Red },
  medium: { value: "Medium", color: Color.Orange },
  low: { value: "Low", color: Color.Blue },
};

export default function Command() {
  const [scope, setScope] = useState<string>();
  const lists = useCachedPromise(() => twoDo<{ list: TwoDoList[] }>("list_lists").then((r) => r.list));
  const smartLists = useCachedPromise(() =>
    twoDo<{ smart_lists: SmartList[] }>("list_smart_lists").then((r) => r.smart_lists),
  );
  const tasks = useCachedPromise(
    // ponytail: capped at 200 (matters for Done); paginate with offset/total_count if that gets hit
    (scope: string) =>
      twoDo<{ tasks: Task[] }>("query_tasks", { ...scopeArgs(scope), limit: 200 }).then((r) => r.tasks),
    [scope ?? ""],
    { execute: !!scope },
  );

  async function run(title: string, command: string, args: object) {
    try {
      await twoDo(command, args);
      await showToast({ style: Toast.Style.Success, title });
      tasks.revalidate();
    } catch (error) {
      await showFailureToast(error, { title: "2Do command failed" });
    }
  }

  return (
    <List
      isLoading={tasks.isLoading || lists.isLoading}
      searchBarPlaceholder="Filter tasks"
      searchBarAccessory={
        <List.Dropdown tooltip="Scope" storeValue onChange={setScope}>
          <List.Dropdown.Section>
            {FOCUSES.map(([id, title, icon]) => (
              <List.Dropdown.Item key={id} value={`focus:${id}`} title={title} icon={icon} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Lists">
            {lists.data?.map((l) => (
              <List.Dropdown.Item key={l.collection_id} value={l.collection_id} title={l.title} />
            ))}
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Smart Lists">
            {smartLists.data?.map((l) => (
              <List.Dropdown.Item key={l.collection_id} value={l.collection_id} title={l.title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!tasks.isLoading && <List.EmptyView icon={Icon.CheckCircle} title="No Tasks" />}
      {tasks.data?.map((t) => (
        <List.Item
          key={t.task_id}
          title={t.title}
          subtitle={t.list_title}
          keywords={[t.notes, ...t.tags.map((tag) => tag.title)]}
          icon={t.completed ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
          accessories={[
            ...t.tags.map((tag) => ({ tag: tag.title })),
            ...(t.priority !== "none" ? [{ tag: PRIORITY_TAGS[t.priority] }] : []),
            ...(t.presentation.due_date_formatted
              ? [
                  {
                    text: {
                      value: t.presentation.due_date_formatted,
                      color: t.presentation.is_overdue ? Color.Red : undefined,
                    },
                  },
                ]
              : []),
            ...(t.starred ? [{ icon: { source: Icon.Star, tintColor: Color.Yellow } }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action.Push
                title="Edit Task"
                icon={Icon.Pencil}
                target={<TaskForm task={t} onSaved={tasks.revalidate} />}
              />
              <Action
                title={t.completed ? "Mark as Not Done" : "Complete Task"}
                icon={t.completed ? Icon.Circle : Icon.CheckCircle}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() =>
                  run(
                    t.completed ? "Marked not done" : "Completed",
                    t.completed ? "uncomplete_task" : "complete_task",
                    {
                      task_id: t.task_id,
                    },
                  )
                }
              />
              <Action
                title={t.starred ? "Unstar" : "Star"}
                icon={Icon.Star}
                shortcut={Keyboard.Shortcut.Common.Pin}
                onAction={() =>
                  run(t.starred ? "Unstarred" : "Starred", "update_task", { task_id: t.task_id, starred: !t.starred })
                }
              />
              <Action
                title="Open in 2Do"
                icon={Icon.AppWindow}
                shortcut={Keyboard.Shortcut.Common.Open}
                onAction={() => twoDo("open_task", { task_id: t.task_id }).catch((e) => showFailureToast(e))}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
