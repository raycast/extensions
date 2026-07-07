import { getPreferenceValues, List, Icon } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { authorize } from "./api/oauth";
import { useState, useEffect } from "react";
import { useSync } from "./hooks/useSync";
import { TaskItem } from "./components/TaskItem";
import { ASTaskItem } from "./components/ASTaskItem";
import { Task } from "./types/ticktick";
import { searchTasks as searchTasksAS } from "./lib/applescript";
import { useFirstRun } from "./lib/useFirstRun";

const { integrationMode } = getPreferenceValues<{ integrationMode: string }>();

// --- API mode ---

function SearchAPI() {
  useFirstRun();
  const [query, setQuery] = useState("");
  const { data, isLoading, revalidate } = useSync();
  const projectMap = new Map(data.projects.map((p) => [p.id, p.name]));

  const q = query.toLowerCase().trim();
  const results = q
    ? data.tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.content?.toLowerCase().includes(q) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(q))
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
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search TickTick" description="Type to search across all your tasks." />
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

// --- AppleScript mode ---

function SearchAppleScript() {
  useFirstRun();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    searchTasksAS(q).then((tasks) => {
      setResults(tasks);
      setIsLoading(false);
    });
  }, [query, refreshKey]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks by title, notes, or tag..."
      onSearchTextChange={setQuery}
      throttle
    >
      {query.trim().length === 0 ? (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Search TickTick" description="Type to search across all your tasks." />
      ) : results.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No results" description={`No tasks match "${query}"`} />
      ) : (
        <List.Section title={`${results.length} result${results.length !== 1 ? "s" : ""}`}>
          {results.map((task) => (
            <ASTaskItem key={task.id} task={task} onRefresh={() => setRefreshKey((k) => k + 1)} />
          ))}
        </List.Section>
      )}
    </List>
  );
}

export default integrationMode === "applescript" ? SearchAppleScript : withAccessToken({ authorize })(SearchAPI);
