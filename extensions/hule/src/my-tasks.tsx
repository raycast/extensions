import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { queryTasks } from "./api/client";
import { ConnectionError } from "./components/ConnectionError";
import { LoadError } from "./components/LoadError";
import { TaskListItem } from "./components/TaskListItem";
import { useHule, type HuleContext } from "./hooks/useHule";
import type { Task } from "./api/types";
import { daysUntil } from "./helpers/dates";
import { acrossWorkspaces, uniqueById } from "./helpers/workspaces";

/**
 * One window of `POST /tasks/query` — the largest `limit` the endpoint accepts
 * (it rejects anything above), so it is the page size rather than a choice.
 */
const PER_WORKSPACE_LIMIT = 100;

/**
 * Tasks assigned to me in every workspace I belong to, open ones only, one page
 * at a time.
 *
 * Takes the workspace/membership pairs rather than the whole context: the
 * arguments of `useCachedPromise` become its cache key by way of JSON, so what
 * travels through here should be small and plain.
 */
function fetchMyTasks(seats: Array<{ workspaceId: string; memberId: string }>) {
  return async ({ page }: { page: number }): Promise<{ data: Task[]; hasMore: boolean }> => {
    if (seats.length === 0) return { data: [], hasMore: false };

    // Every workspace is asked for the same page. One that has run out answers
    // with an empty page — harmless — and the list goes on while any workspace
    // still fills its window.
    const perWorkspace = await acrossWorkspaces(seats, ({ workspaceId, memberId }) =>
      queryTasks(
        workspaceId,
        {
          combinator: "and",
          rules: [
            { field: "assigneeId", operator: "=", value: memberId },
            // Finished work is dropped by the SERVER, not below: the window is
            // capped, so filtering afterwards would spend the cap on completed
            // tasks and hide the open ones behind them.
            { field: "statusGroup", operator: "!=", value: "done" },
          ],
        },
        PER_WORKSPACE_LIMIT,
        page + 1,
        // A subtask assigned to me is my work as much as a task is.
        { withSubtasks: true },
      ),
    );

    // No second, client-side "is it done" check: the server's status group is
    // the truth, and `completedAt` can outlive a status that was moved back into
    // an open group — filtering on it hid open work.
    return {
      data: perWorkspace.flat(),
      hasMore: perWorkspace.some((tasks) => tasks.length >= PER_WORKSPACE_LIMIT),
    };
  };
}

/** Where I am a member, and under which membership id. */
function seatsOf(context: HuleContext | undefined): Array<{ workspaceId: string; memberId: string }> {
  if (!context) return [];
  return context.bundle.workspaces.flatMap((workspace) => {
    const memberId = context.myMemberId(workspace.id);
    return memberId ? [{ workspaceId: workspace.id, memberId }] : [];
  });
}

const BUCKETS = ["Overdue", "Today", "Tomorrow", "Later", "No Due Date"] as const;
type Bucket = (typeof BUCKETS)[number];

function bucketOf(task: Task): Bucket {
  const days = daysUntil(task.dueDate);
  if (days === null) return "No Due Date";
  if (days < 0) return "Overdue";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return "Later";
}

export default function Command() {
  const { data: context, isLoading: contextLoading, error, revalidate: reloadContext } = useHule();
  const seats = useMemo(() => seatsOf(context), [context]);
  const {
    data,
    isLoading,
    error: loadError,
    revalidate,
    pagination,
  } = useCachedPromise(fetchMyTasks, [seats], {
    execute: seats.length > 0,
    keepPreviousData: true,
    // The failure is drawn in the list itself (LoadError) — no second, generic toast.
    onError: () => undefined,
  });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  const all = loadError ? [] : uniqueById(data ?? []);
  const refresh = () => {
    revalidate();
    reloadContext();
  };

  return (
    <List isLoading={contextLoading || isLoading} pagination={pagination} searchBarPlaceholder="Filter your tasks…">
      {loadError && <LoadError error={loadError} onRetry={revalidate} />}
      {!loadError && all.length === 0 && !isLoading && (
        <List.EmptyView icon={Icon.Checkmark} title="All Clear" description="No open task is assigned to you." />
      )}
      {BUCKETS.map((bucket) => {
        const section = all.filter((task) => bucketOf(task) === bucket);
        if (section.length === 0 || !context) return null;
        return (
          <List.Section key={bucket} title={bucket} subtitle={String(section.length)}>
            {section.map((task) => (
              <TaskListItem key={task.id} task={task} context={context} onChange={refresh} />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}
