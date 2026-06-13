import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { api } from "../lib/api";
import type { PostponePreset, Task, Workspace } from "../lib/types";
import { TaskItem } from "./task-item";

interface SubtasksListProps {
  parent: Task;
  workspaces: Workspace[];
  postponePresets: PostponePreset[] | null;
  onChange: () => void;
}

export function SubtasksList({
  parent,
  workspaces,
  postponePresets,
  onChange,
}: SubtasksListProps) {
  const { data, isLoading, revalidate } = useCachedPromise(
    (parentId: string) =>
      api<Task[]>(`/api/tasks?parentId=${encodeURIComponent(parentId)}`),
    [parent.id],
    { initialData: parent.subtasks ?? [] },
  );

  function refresh() {
    revalidate();
    onChange();
  }

  const subtasks = data ?? [];

  const section = (title: string, items: Task[]) => (
    <List.Section title={title} subtitle={String(items.length)}>
      {items.map((t) => (
        <TaskItem
          key={t.id}
          task={t}
          workspaces={workspaces}
          postponePresets={postponePresets}
          revalidate={refresh}
        />
      ))}
    </List.Section>
  );

  return (
    <List isLoading={isLoading} navigationTitle={`Subtasks — ${parent.title}`}>
      <List.EmptyView
        title="No Subtasks"
        description={`“${parent.title}” has no subtasks yet.`}
      />
      {section(
        "Open",
        subtasks.filter((t) => t.status !== "DONE"),
      )}
      {section(
        "Done",
        subtasks.filter((t) => t.status === "DONE"),
      )}
    </List>
  );
}
