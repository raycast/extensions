import { useState, useMemo } from "react";
import { Icon, List } from "@raycast/api";
import { useSearchTasks } from "./hooks/useSearchTasks";
import { Task } from "./views/TaskList/Task";
import { useTeams } from "./hooks/useTeams";
import preferences from "./utils/preferences";
import { TaskItem } from "./types/tasks.dt";

// Calculate relevance score for sorting
function calculateRelevanceScore(task: TaskItem, searchQuery: string): number {
  const query = searchQuery.toLowerCase().trim();
  const taskName = task.name.toLowerCase();
  const taskId = task.id.toLowerCase();
  const customId = task.custom_id?.toLowerCase() || "";

  // Perfect match on task name - highest priority
  if (taskName === query) return 1000;

  // Starts with query in task name - very high priority
  if (taskName.startsWith(query)) return 900;

  // ID matches
  if (taskId === query || customId === query) return 800;

  // Contains query at word boundary in task name (e.g., "38848 【受入追加対応_1】")
  const wordBoundaryRegex = new RegExp(`\\b${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  if (wordBoundaryRegex.test(taskName)) return 700;

  // Contains query anywhere in task name
  if (taskName.includes(query)) return 500;

  // ID partial match
  if (taskId.includes(query) || customId.includes(query)) return 400;

  // Contains in description
  const description = task.description?.toLowerCase() || "";
  if (description.includes(query)) return 300;

  // Default score
  return 100;
}

export default function SearchTasks() {
  const [searchText, setSearchText] = useState("");
  const { teams, isLoading: teamsLoading } = useTeams();

  // Get teamId from preferences or use the first team
  const teamId = preferences.teamId || teams[0]?.id || "";

  const { isLoading: searchLoading, tasks } = useSearchTasks({
    teamId,
    searchQuery: searchText,
    includeClosed: false,
    includeSubtasks: true,
  });

  const isLoading = teamsLoading || searchLoading;

  // Sort tasks by relevance
  const sortedTasks = useMemo(() => {
    if (!searchText.trim()) return tasks;

    return [...tasks].sort((a, b) => {
      const scoreA = calculateRelevanceScore(a, searchText);
      const scoreB = calculateRelevanceScore(b, searchText);
      return scoreB - scoreA; // Higher score first
    });
  }, [tasks, searchText]);

  // Group sorted tasks by list
  const tasksByList = sortedTasks.reduce<Record<string, TaskItem[]>>((acc, task) => {
    const listName = task.list?.name || "Unknown List";
    if (!acc[listName]) {
      acc[listName] = [];
    }
    acc[listName].push(task);
    return acc;
  }, {});

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search tasks by name or description..."
      throttle
    >
      {searchText.trim().length === 0 ? (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Search ClickUp Tasks"
          description="Type to search tasks across your team"
        />
      ) : tasks.length === 0 && !isLoading ? (
        <List.EmptyView icon={Icon.XMarkCircle} title="No tasks found" description={`No results for "${searchText}"`} />
      ) : (
        Object.entries(tasksByList).map(([listName, listTasks]) => (
          <List.Section key={listName} title={listName} subtitle={`${listTasks.length} tasks`}>
            {listTasks.map((task) => (
              <Task key={task.id} task={task} />
            ))}
          </List.Section>
        ))
      )}
    </List>
  );
}
