import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { searchTasks } from "./api";
import TaskListItem from "./components/TaskListItem";
import { todayIn } from "./helpers/dates";
import { useProjects, useUserSettings } from "./hooks/useData";

function stripSnippet(snippet: string): string {
  return snippet.replace(/<\/?b>/g, "");
}

export default function Search() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"open" | "all">("open");

  const { data: projects } = useProjects();
  const { data: settings } = useUserSettings();
  const {
    data: results,
    isLoading,
    mutate,
  } = useCachedPromise(
    (q: string, includeCompleted: boolean) => searchTasks(q, includeCompleted),
    [query, scope === "all"],
    {
      execute: query.trim().length > 0,
      keepPreviousData: true,
    },
  );

  const today = todayIn(settings?.timezone);

  return (
    <List
      isLoading={isLoading}
      throttle
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search tasks and comments"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Search scope"
          value={scope}
          onChange={(newValue) => setScope(newValue as "open" | "all")}
        >
          <List.Dropdown.Item title="Open Tasks" value="open" icon={Icon.Circle} />
          <List.Dropdown.Item title="All Tasks" value="all" icon={Icon.CheckCircle} />
        </List.Dropdown>
      }
    >
      {results?.map((result) => (
        <TaskListItem
          key={result.task.id}
          task={result.task}
          today={today}
          mutate={mutate}
          projects={projects}
          subtitle={result.matched_in === "comment" ? `💬 ${stripSnippet(result.snippet)}` : undefined}
          timeFormat={settings?.timeFormat}
        />
      ))}
      <List.EmptyView
        icon={Icon.MagnifyingGlass}
        title={query.trim() ? "No results" : "Search your tasks"}
        description={query.trim() ? "Try a different query." : "Full-text search across tasks and comments."}
      />
    </List>
  );
}
