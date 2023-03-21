import fetch from "node-fetch";
import { getOAuthToken } from "../components/withHeightAuth";
import { CreateTaskPayload, TaskObject, UpdateBatchTaskPayload, UpdateTaskPayload } from "../types/task";
import { ApiErrorResponse, ApiResponse } from "../types/utils";
import { ApiUrls } from "./helpers";

export const ApiTask = {
  async get(endpoint: string) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return (await response.json()) as ApiResponse<TaskObject[]>;
    } else {
      throw new Error(((await response.json()) as ApiErrorResponse).error.message);
    }
  },
  async getOne(endpoint: string) {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return (await response.json()) as TaskObject;
    } else {
      throw new Error(((await response.json()) as ApiErrorResponse).error.message);
    }
  },
  async create(values: CreateTaskPayload) {
    const response = await fetch(ApiUrls.tasks, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
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
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  },
  update(taskId: string, values: UpdateTaskPayload) {
    return fetch(`${ApiUrls.tasks}/${taskId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${getOAuthToken()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });
  },
};
