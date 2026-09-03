import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { queryTasks, searchTasks } from "./api/client";
import type { Task } from "./api/types";
import { ConnectionError } from "./components/ConnectionError";
import { TaskListItem } from "./components/TaskListItem";
import { useHule } from "./hooks/useHule";

const RECENTS_LIMIT = 25;
const ALL = "all";

/**
 * Search, or — on an empty bar — the tasks that moved most recently, which is
 * what the command is usually opened for. `POST /tasks/query` already answers
 * newest-updated-first, so "recent" needs no filter and no local history.
 *
 * Every workspace is searched at once by default: which workspace a task lives
 * in is rarely what you remember about it. The ids arrive as a plain array —
 * they double as this promise's cache key.
 */
async function fetchTasks(workspaceIds: string[], term: string): Promise<{ tasks: Task[]; recents: boolean }> {
  if (workspaceIds.length === 0) return { tasks: [], recents: true };
  const query = term.trim();

  if (query.length === 0) {
    const perWorkspace = await Promise.all(workspaceIds.map((id) => queryTasks(id, undefined, RECENTS_LIMIT)));
    const merged = perWorkspace
      .flat()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
      .slice(0, RECENTS_LIMIT);
    return { tasks: merged, recents: true };
  }

  const perWorkspace = await Promise.all(workspaceIds.map((id) => searchTasks(id, query)));
  return { tasks: perWorkspace.flatMap((result) => result.items ?? []), recents: false };
}

export default function Command() {
  const { data: context, isLoading: contextLoading, error, revalidate: reloadContext } = useHule();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(ALL);

  const workspaces = useMemo(() => context?.bundle.workspaces ?? [], [context]);
  const workspaceIds = useMemo(() => (scope === ALL ? workspaces.map((w) => w.id) : [scope]), [scope, workspaces]);

  const { data, isLoading, revalidate } = useCachedPromise(fetchTasks, [workspaceIds, query], {
    execute: workspaceIds.length > 0,
    keepPreviousData: true,
  });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  const tasks = data?.tasks ?? [];
  const recents = data?.recents ?? true;
  const refresh = () => {
    revalidate();
    reloadContext();
  };

  return (
    <List
      isLoading={contextLoading || isLoading}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search tasks…"
      throttle
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown tooltip="Workspace" value={scope} onChange={setScope} storeValue>
            <List.Dropdown.Item title="All Workspaces" value={ALL} icon={Icon.Globe} />
            <List.Dropdown.Section>
              {workspaces.map((workspace) => (
                <List.Dropdown.Item key={workspace.id} title={workspace.name} value={workspace.id} />
              ))}
            </List.Dropdown.Section>
          </List.Dropdown>
        ) : undefined
      }
    >
      {tasks.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title={recents ? "Nothing Here Yet" : "Nothing Found"}
          description={recents ? "Create a task and it shows up here." : `No task matches “${query}”.`}
        />
      )}
      {context && (
        <List.Section
          title={recents ? "Recent" : "Results"}
          subtitle={tasks.length > 0 ? String(tasks.length) : undefined}
        >
          {tasks.map((task) => (
            <TaskListItem key={task.id} task={task} context={context} onChange={refresh} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
