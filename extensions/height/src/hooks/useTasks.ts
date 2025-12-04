import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { orderBy } from "lodash-es";
import { useMemo } from "react";

import { ApiUrls } from "@/api/helpers";
import { getTask } from "@/api/task";
import { Preferences, CachedPromiseOptionsType } from "@/types/utils";

type Props = {
  listId?: string;
  assigneeId?: string;
  options?: CachedPromiseOptionsType<Awaited<ReturnType<typeof getTask>>>;
};

type EndpointProps = Pick<Props, "listId" | "assigneeId"> & {
  apiResultsLimit?: Preferences["apiResultsLimit"];
};

const endpoint = ({ listId, assigneeId, apiResultsLimit }: EndpointProps) => {
  const filters = {};

  if (listId) {
    Object.assign(filters, { listIds: { values: [listId] } });
  }

  if (assigneeId && assigneeId !== "all") {
    Object.assign(filters, { assigneesIds: { values: [assigneeId] } });
  }

  const stringifiedFilters = JSON.stringify(filters);

  const order = JSON.stringify([
    { column: "lastActivityAt", direction: "DESC" },
    { column: "createdAt", direction: "DESC" },
  ]);

  const include = JSON.stringify(["Lists", "ParentTasks"]);

  return `${ApiUrls.tasks}?filters=${stringifiedFilters}&order=${order}&include=${include}&limit=${apiResultsLimit}`;
};

export default function useTasks({ listId, assigneeId, options }: Props = {}) {
  const { apiResultsLimit } = getPreferenceValues<Preferences>();

  const { data, error, isLoading, mutate } = useCachedPromise(
    (listId, assigneeId, apiResultsLimit) => getTask(endpoint({ listId, assigneeId, apiResultsLimit })),
    [listId, assigneeId, apiResultsLimit],
    {
      ...options,
    },
  );

  const { unorderedTasks, orderedTasks } = useMemo(() => {
    const unorderedTasks = data?.list?.filter(
      (task) => !task.deleted && (assigneeId === "all" ? task.assigneesIds.length > 0 : true),
    );

    const orderedTasks = orderBy(
      unorderedTasks,
      [(item) => item.fields.find((field) => field.name.toLowerCase() === "due date")?.date, "createdAt"],
      ["asc", "desc"],
    );

    return { unorderedTasks, orderedTasks };
  }, [data, assigneeId]);

  return {
    tasksData: data?.list,
    tasks: orderedTasks,
    unorderedTasks,
    tasksError: error,
    tasksIsLoading: isLoading,
    tasksMutate: mutate,
  };
}
