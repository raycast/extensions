import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { queryTasks, webBase } from "./api/client";
import { ConnectionError } from "./components/ConnectionError";
import { TaskListItem } from "./components/TaskListItem";
import { useHule, type HuleContext } from "./hooks/useHule";
import type { Task } from "./api/types";
import { daysUntil } from "./helpers/dates";

/**
 * Hard ceiling of `POST /tasks/query`: it is the widget endpoint, it caps
 * `limit` at 100 server-side and answers with a bare array — no total, no
 * cursor. A workspace therefore cannot be paged through, and the only honest
 * thing a client can do is NOTICE the ceiling and say so (see `truncated`).
 */
const PER_WORKSPACE_LIMIT = 100;

/**
 * Tasks assigned to me in every workspace I belong to, open ones only.
 *
 * Takes the workspace/membership pairs rather than the whole context: the
 * arguments of `useCachedPromise` become its cache key by way of JSON, so what
 * travels through here should be small and plain.
 */
async function fetchMyTasks(
  seats: Array<{ workspaceId: string; memberId: string }>,
): Promise<{ tasks: Task[]; truncated: boolean }> {
  const perWorkspace = await Promise.all(
    seats.map(({ workspaceId, memberId }) =>
      queryTasks(
        workspaceId,
        {
          combinator: "and",
          rules: [
            { field: "assigneeId", operator: "=", value: memberId },
            // Finished work is dropped by the SERVER, not below: the endpoint caps
            // its answer at `limit`, so filtering afterwards would spend that cap on
            // completed tasks and silently hide the open ones behind them.
            { field: "statusGroup", operator: "!=", value: "done" },
          ],
        },
        PER_WORKSPACE_LIMIT,
      ),
    ),
  );
  return {
    tasks: perWorkspace.flat().filter((task) => task.completedAt === null),
    truncated: perWorkspace.some((tasks) => tasks.length >= PER_WORKSPACE_LIMIT),
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
  const { data, isLoading, revalidate } = useCachedPromise(fetchMyTasks, [seats], {
    execute: seats.length > 0,
    keepPreviousData: true,
  });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  const all = data?.tasks ?? [];
  const refresh = () => {
    revalidate();
    reloadContext();
  };

  return (
    <List isLoading={contextLoading || isLoading} searchBarPlaceholder="Filter your tasks…">
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
      {data?.truncated && (
        <List.Section title="Not everything fits">
          <List.Item
            icon={Icon.Info}
            title={`Showing the first ${PER_WORKSPACE_LIMIT} tasks per workspace`}
            subtitle="Open Hule to see the rest"
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Hule" url={webBase()} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
