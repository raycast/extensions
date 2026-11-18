import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { List as TwoDoList, scopeArgs, SmartList, Task, twoDo } from "./2do";
import { TaskItem } from "./task-item";

const FOCUSES = [
  ["all", "All", Icon.Tray],
  ["today", "Today", Icon.Calendar],
  ["starred", "Starred", Icon.Star],
  ["scheduled", "Scheduled", Icon.Clock],
  ["done", "Done", Icon.CheckCircle],
] as const;

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
        <TaskItem key={t.task_id} task={t} onChange={tasks.revalidate} />
      ))}
    </List>
  );
}
