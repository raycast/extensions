import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { ApiHeaders, ApiUrls } from "../api/helpers";
import { TaskObject } from "../types/task";
import { ApiResponse } from "../types/utils";

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

  // const order = [{ column: "4daa1897-ee97-492a-aa21-f883a17aebdd", direction: "DESC" }];
  const order = [{ column: "createdAt", direction: "DESC" }];

  const endpoint = ApiUrls.tasks + "?" + "filters=" + JSON.stringify(filters) + "&" + "order=" + JSON.stringify(order);

  console.log("endpoint:", endpoint);

  const { data, error, isLoading, mutate } = useFetch<ApiResponse<TaskObject[]>>(endpoint, {
    headers: ApiHeaders,
    ...options,
  });

  const { tasks } = useMemo(() => {
    const tasks = data?.list?.filter(
      (task) => !task.deleted && (assigneeId === "all" ? task.assigneesIds.length > 0 : true)
    );

    return { tasks };
  }, [data, assigneeId]);

  return {
    tasksData: data?.list,
    tasks,
    tasksError: error,
    tasksIsLoading: isLoading,
    tasksMutate: mutate,
  };
}
