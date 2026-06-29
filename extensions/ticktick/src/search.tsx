import { List, Icon } from "@raycast/api";
import { useState } from "react";
import { useSync } from "./hooks/useSync";
import { TaskItem } from "./components/TaskItem";

export default function Search() {
  const [query, setQuery] = useState("");
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  const q = query.toLowerCase().trim();
  const results = q
    ? data.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q)),
      )
    : [];

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks by title, notes, or tag..."
      onSearchTextChange={setQuery}
      throttle
    >
      {q.length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search TickTick"
          description="Type to search across all your tasks."
        />
      ) : results.length === 0 ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No results" description={`No tasks match "${query}"`} />
      ) : (
        <List.Section title={`${results.length} result${results.length !== 1 ? "s" : ""}`}>
          {results.map((task) => (
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
      )}
    </List>
  );
}
