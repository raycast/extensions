import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Task, twoDo } from "./2do";
import { TaskForm } from "./task-form";
import { TaskItem } from "./task-item";

// A project's or checklist's items, with the usual task actions. 2Do's queries never return items,
// so they're only reachable here.
export function ItemsView({ parent, onChange }: { parent: Task; onChange: () => void }) {
  const items = useCachedPromise(
    (id: string) => twoDo<{ tasks: Task[] }>("list_subtasks", { task_id: id }).then((r) => r.tasks),
    [parent.task_id],
  );
  const done = items.data?.filter((t) => t.completed).length ?? 0;

  function reload() {
    items.revalidate();
    onChange();
  }

  const addItem = (
    <ActionPanel>
      <Action.Push title="Add Item" icon={Icon.Plus} target={<TaskForm addTo={parent} onSaved={reload} />} />
    </ActionPanel>
  );

  return (
    <List navigationTitle={parent.title} isLoading={items.isLoading} searchBarPlaceholder="Filter items">
      {!items.isLoading && <List.EmptyView icon={Icon.List} title="No Items" actions={addItem} />}
      {!parent.completed && <List.Item title="Add Item" icon={Icon.Plus} actions={addItem} />}
      <List.Section title={items.data ? `${done} of ${items.data.length} done` : undefined}>
        {items.data?.map((t) => (
          <TaskItem key={t.task_id} task={t} parentId={parent.task_id} onChange={reload} />
        ))}
      </List.Section>
    </List>
  );
}
