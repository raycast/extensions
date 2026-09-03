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
 * Tasks assigned to me in every workspace I belong to, open ones only.
 *
 * Takes the workspace/membership pairs rather than the whole context: the
 * arguments of `useCachedPromise` become its cache key by way of JSON, so what
 * travels through here should be small and plain.
 */
async function fetchMyTasks(seats: Array<{ workspaceId: string; memberId: string }>): Promise<Task[]> {
  const perWorkspace = await Promise.all(
    seats.map(({ workspaceId, memberId }) =>
      queryTasks(workspaceId, {
        combinator: "and",
        rules: [{ field: "assigneeId", operator: "=", value: memberId }],
      }),
    ),
  );
  return perWorkspace.flat().filter((task) => task.completedAt === null);
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
    data: tasks,
    isLoading,
    revalidate,
  } = useCachedPromise(fetchMyTasks, [seats], { execute: seats.length > 0, keepPreviousData: true });

  if (error) return <ConnectionError message={error.message} onRetry={reloadContext} />;

  const all = tasks ?? [];
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
    </List>
  );
}
