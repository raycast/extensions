import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { orderBy } from "lodash-es";
import { useMemo } from "react";
import { ApiUrls } from "../api/helpers";
import { ApiTask } from "../api/task";
import { Preferences, UseCachedPromiseOptions } from "../types/utils";

type Props = {
  listId?: string;
  assigneeId?: string;
  options?: UseCachedPromiseOptions<typeof ApiTask.get>;
};

export default function useTasks({ listId, assigneeId, options }: Props = {}) {
  const filters = {};

  if (listId) {
    Object.assign(filters, { listIds: { values: [listId] } });
  }

  if (assigneeId !== undefined && assigneeId !== "all") {
    Object.assign(filters, { assigneesIds: { values: [assigneeId] } });
  }

  const stringifiedFilters = JSON.stringify(filters);

  const order = JSON.stringify([
    { column: "lastActivityAt", direction: "DESC" },
    { column: "createdAt", direction: "DESC" },
  ]);

  const include = JSON.stringify(["Lists", "ParentTasks"]);

  const { apiResultsLimit } = getPreferenceValues<Preferences>();

  const endpoint = `${ApiUrls.tasks}?filters=${stringifiedFilters}&order=${order}&include=${include}&limit=${apiResultsLimit}`;

  const { data, error, isLoading, mutate } = useCachedPromise(() => ApiTask.get(endpoint), [], {
    ...options,
  });

  const { unorderedTasks, orderedTasks } = useMemo(() => {
    const unorderedTasks = data?.list?.filter(
      (task) => !task.deleted && (assigneeId === "all" ? task.assigneesIds.length > 0 : true)
    );

    const orderedTasks = orderBy(
      unorderedTasks,
      [(item) => item.fields.find((field) => field.name.toLowerCase() === "due date")?.date, "createdAt"],
      ["asc", "desc"]
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
