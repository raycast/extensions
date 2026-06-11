import { List, ActionPanel, Action, Icon, Color, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import TaskDetail from "./task-detail";
import { useActiveProject } from "./preferences";
import { runBacklog } from "./backlog";

interface SearchResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  score: string;
  type: string;
}

const PRIORITY_TAGS: Record<string, Color> = {
  high: Color.Red,
  medium: Color.Orange,
  low: Color.SecondaryText,
};

function parseSearchResults(output: string): SearchResult[] {
  const results: SearchResult[] = [];
  let currentType = "task";

  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Section headers: "Tasks:", "Documents:", "Decisions:"
    if (trimmed === "Tasks:") {
      currentType = "task";
      continue;
    }
    if (trimmed === "Documents:") {
      currentType = "document";
      continue;
    }
    if (trimmed === "Decisions:") {
      currentType = "decision";
      continue;
    }

    // Task result: TASK-23 - Title (Status) [PRIORITY] [score 0.774]
    const taskMatch = trimmed.match(/^([\w-]+)\s+-\s+(.+?)\s+\(([^)]+)\)\s+\[(\w+)\]\s+\[score\s+([\d.]+)\]$/);
    if (taskMatch) {
      results.push({
        id: taskMatch[1],
        title: taskMatch[2],
        status: taskMatch[3],
        priority: taskMatch[4].toLowerCase(),
        score: taskMatch[5],
        type: currentType,
      });
    }
  }

  return results;
}

function getEmptyView(results: SearchResult[], isLoading: boolean, query: string, projectCount: number) {
  if (isLoading) return undefined;

  if (projectCount === 0) {
    return (
      <List.EmptyView title="No project configured" description="Set a Backlog.md project directory in preferences." />
    );
  }

  if (!query) {
    return <List.EmptyView title="Search tasks" description="Type a query to search across the selected project." />;
  }

  if (results.length === 0) {
    return <List.EmptyView title="No matches found" description="Try a different search term." />;
  }

  return undefined;
}

export default function Command() {
  const [activeProject, setActiveProject, config] = useActiveProject();
  const [searchText, setSearchText] = useState("");

  const { isLoading, data, revalidate } = usePromise(
    async (cwd: string, query: string) => {
      if (!query) return [];
      const stdout = await runBacklog(["search", query, "--type", "task", "--plain"], cwd);
      return parseSearchResults(stdout);
    },
    [activeProject, searchText],
    {
      execute: !!activeProject && searchText.length > 0,
      onError: (error) => {
        showToast({ style: Toast.Style.Failure, title: "Search failed", message: error.message });
      },
    },
  );

  const results = data || [];
  const emptyView = getEmptyView(results, isLoading, searchText, config.projects.length);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search tasks..."
      filtering={false}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        config.projects.length > 1 ? (
          <List.Dropdown tooltip="Switch Project" value={activeProject} onChange={setActiveProject}>
            {config.projects.map((p) => (
              <List.Dropdown.Item key={p.path} title={p.name} value={p.path} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {emptyView}
      {results.map((result) => {
        const priorityColor = PRIORITY_TAGS[result.priority] || Color.SecondaryText;

        return (
          <List.Item
            key={result.id}
            title={result.title}
            subtitle={result.id}
            accessories={[
              { tag: { value: result.status, color: Color.SecondaryText } },
              { tag: { value: result.priority, color: priorityColor } },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={<TaskDetail taskId={result.id} projectDir={activeProject} onRefresh={revalidate} />}
                />
                <Action.CopyToClipboard title="Copy Task ID" content={result.id} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
