import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { TaskObject } from "../types/task";
import { ApiResponse } from "../types/utils";
import { orderBy } from "lodash-es";

type Props = {
  listId?: string;
  assigneeId?: string;
  options?: Parameters<typeof useFetch<ApiResponse<TaskObject[]>>>[1];
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

  const order = JSON.stringify([{ column: "createdAt", direction: "DESC" }]);

  const include = JSON.stringify(["Lists"]);

  const endpoint = `${ApiUrls.tasks}?filters=${stringifiedFilters}&order=${order}&include=${include}`;

  const { data, error, isLoading, mutate } = useFetch<ApiResponse<TaskObject[]>>(endpoint, {
    headers: ApiHeaders,
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
