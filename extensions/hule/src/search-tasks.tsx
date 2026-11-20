import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo, useState } from "react";
import { queryTasks, searchTasks } from "./api/client";
import type { Task } from "./api/types";
import { ConnectionError } from "./components/ConnectionError";
import { LoadError } from "./components/LoadError";
import { TaskListItem } from "./components/TaskListItem";
import { acrossWorkspaces, uniqueById } from "./helpers/workspaces";
import { useHule } from "./hooks/useHule";

const RECENTS_LIMIT = 25;
const PAGE_SIZE = 50;
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
function fetchTasks(workspaceIds: string[], term: string) {
  return async ({ page }: { page: number }): Promise<{ data: Task[]; hasMore: boolean }> => {
    if (workspaceIds.length === 0) return { data: [], hasMore: false };
    const query = term.trim();

    // An empty bar is not a search but "what moved recently" — one window of the
    // freshest rows, deliberately unpaged: a recents list nobody scrolls past
    // twenty-five would only pay for the extra round trips.
    if (query.length === 0) {
      if (page > 0) return { data: [], hasMore: false };
      const perWorkspace = await acrossWorkspaces(workspaceIds, (id) => queryTasks(id, undefined, RECENTS_LIMIT));
      const merged = perWorkspace
        .flat()
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, RECENTS_LIMIT);
      return { data: merged, hasMore: false };
    }

    const perWorkspace = await acrossWorkspaces(workspaceIds, (id) => searchTasks(id, query, PAGE_SIZE, page + 1));
    return {
      data: perWorkspace.flatMap((result) => result.items ?? []),
      // Search reports a total per workspace, so "is there more" is read off the
      // reply. The total counts the server's ranking pool, not every match, and a
      // re-ranked pool can shift a row across a page boundary — the list drops
      // such repeats by id.
      hasMore: perWorkspace.some((result) => result.page * result.limit < result.total),
    };
  };
}

export default function Command() {
  const { data: context, isLoading: contextLoading, error, revalidate: reloadContext } = useHule();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState(ALL);

  const workspaces = useMemo(() => context?.bundle.workspaces ?? [], [context]);
  // The dropdown remembers its value between runs; a workspace left since then
  // falls back to all of them instead of querying a membership that is gone.
  const known = scope === ALL || workspaces.some((w) => w.id === scope);
  const workspaceIds = useMemo(
    () => (known && scope !== ALL ? [scope] : workspaces.map((w) => w.id)),
    [known, scope, workspaces],
  );

  const {
    data,
    isLoading,
    error: loadError,
    revalidate,
    pagination,
  } = useCachedPromise(fetchTasks, [workspaceIds, query], {
    execute: workspaceIds.length > 0,
    keepPreviousData: true,
    // The failure is drawn in the list itself (LoadError) — no second, generic toast.
    onError: () => undefined,
  });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  // A failed query shows the failure, never the previous query's rows.
  const tasks = loadError ? [] : uniqueById(data ?? []);
  // Which mode the list is in follows from the bar, not from the answer: the
  // reply is a flat page either way.
  const recents = query.trim().length === 0;
  const refresh = () => {
    revalidate();
    reloadContext();
  };

  return (
    <List
      isLoading={contextLoading || isLoading}
      pagination={pagination}
      onSearchTextChange={setQuery}
      searchBarPlaceholder="Search tasks…"
      throttle
      searchBarAccessory={
        workspaces.length > 1 ? (
          <List.Dropdown tooltip="Workspace" value={known ? scope : ALL} onChange={setScope} storeValue>
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
      {loadError && <LoadError error={loadError} onRetry={revalidate} />}
      {!loadError && tasks.length === 0 && !isLoading && (
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
