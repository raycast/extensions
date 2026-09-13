import { Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { queryTasks } from "./api/client";
import { ConnectionError } from "./components/ConnectionError";
import { TaskListItem } from "./components/TaskListItem";
import { useHule, type HuleContext } from "./hooks/useHule";
import type { Task } from "./api/types";
import { daysUntil } from "./helpers/dates";

/**
 * One window of `POST /tasks/query`. The endpoint clamps `limit` to this
 * server-side, so it is the page size rather than a choice.
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
  return async ({
    page,
    lastItem,
  }: {
    page: number;
    lastItem?: Task;
  }): Promise<{
    data: Task[];
    hasMore: boolean;
  }> => {
    if (seats.length === 0) return { data: [], hasMore: false };

    const perWorkspace = await Promise.all(
      seats.map(({ workspaceId, memberId }) =>
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
        ),
      ),
    );

    // A server older than the change that added `page` answers every request
    // with the first window, and the answer carries neither a total nor a cursor
    // to notice that with. The one signal left is the row we already ended on
    // coming back again — then paging is unavailable and this is the last page.
    const data = perWorkspace.flat().filter((task) => task.completedAt === null);
    const repeated = lastItem !== undefined && data.at(-1)?.id === lastItem.id;

    return {
      data: repeated ? [] : data,
      hasMore: !repeated && perWorkspace.some((tasks) => tasks.length >= PER_WORKSPACE_LIMIT),
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
  const { data, isLoading, revalidate, pagination } = useCachedPromise(fetchMyTasks, [seats], {
    execute: seats.length > 0,
    keepPreviousData: true,
  });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  const all = data ?? [];
  const refresh = () => {
    revalidate();
    reloadContext();
  };

  return (
    <List isLoading={contextLoading || isLoading} pagination={pagination} searchBarPlaceholder="Filter your tasks…">
      {all.length === 0 && (
        <List.EmptyView icon={Icon.Checkmark} title="Nothing on You" description="No open task is assigned to you." />
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
