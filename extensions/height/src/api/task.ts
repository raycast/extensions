import fetch from "node-fetch";
import { CreateTaskPayload, TaskObject, UpdateBatchTaskPayload, UpdateTaskPayload } from "../types/task";
import { ApiErrorResponse } from "../types/utils";
import { ApiHeaders, ApiUrls } from "./helpers";

export const ApiTask = {
  async create(values: CreateTaskPayload) {
    const response = await fetch(ApiUrls.tasks, {
      method: "POST",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });

    if (response.ok) {
      return [(await response.json()) as TaskObject, null] as const;
    } else {
      return [null, ((await response.json()) as ApiErrorResponse).error] as const;
    }
  },
  batchUpdate(payload: UpdateBatchTaskPayload) {
    return fetch(ApiUrls.tasks, {
      method: "PATCH",
      headers: ApiHeaders,
      body: JSON.stringify(payload),
    });
  },
  update(taskId: string, values: UpdateTaskPayload) {
    return fetch(`${ApiUrls.tasks}/${taskId}`, {
      method: "PUT",
      headers: ApiHeaders,
      body: JSON.stringify(values),
    });
  },
};
