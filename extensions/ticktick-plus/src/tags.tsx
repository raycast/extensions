import { List, Icon } from "@raycast/api";
import { useSync } from "./hooks/useSync";
import { useAlerts } from "./hooks/useAlerts";
import { TaskItem } from "./components/TaskItem";

export default function Tags() {
  useAlerts();
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  // Build tag → tasks map from synced data + API tags
  const tagTaskMap = new Map<string, typeof data.tasks>();
  for (const task of data.tasks) {
    for (const tag of task.tags ?? []) {
      if (!tagTaskMap.has(tag)) tagTaskMap.set(tag, []);
      tagTaskMap.get(tag)!.push(task);
    }
  }

  // Include tags from API that have no tasks
  for (const tag of data.tags) {
    if (!tagTaskMap.has(tag.name)) tagTaskMap.set(tag.name, []);
  }

  const sortedTags = [...tagTaskMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <List isLoading={isLoading} navigationTitle="Tags" searchBarPlaceholder="Search tags...">
      {sortedTags.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.Tag} title="No tags" description="Add tags to tasks in TickTick." />
      ) : (
        sortedTags.map(([tagName, tasks]) => (
          <List.Section key={tagName} title={`#${tagName} · ${tasks.length}`}>
            {tasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                projects={data.projects}
                projectName={projectMap.get(task.projectId)}
                onComplete={revalidate}
                onDelete={revalidate}
                onRevalidate={revalidate}
              />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
