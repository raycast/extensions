import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import axios, { AxiosError } from "axios";
import useSWR from "swr";
import { TaskPayload } from "./types";
import { showApiToastError } from "./utils";

const preferences = getPreferenceValues();

export const axiosInstance = axios.create({
  baseURL: "https://api.todoist.com/rest/v1",
  headers: { Authorization: `Bearer ${preferences.token}` },
});

export async function createTask(body: TaskPayload) {
  await showToast(ToastStyle.Animated, "Creating task");

  return axiosInstance
    .post("/tasks", body)
    .then(() => showToast(ToastStyle.Success, "Task created"))
    .catch((error) => showApiToastError({ error, title: "Failed to create task", message: error.message }));
}

export async function completeTask(id: number) {
  await showToast(ToastStyle.Animated, "Completing task");

  return axiosInstance
    .post(`/tasks/${id}/close`)
    .then(() => showToast(ToastStyle.Success, "Task achieved. Well done! 🙌"))
    .catch((error) => showApiToastError({ error, title: "Failed to complete task", message: error.message }));
}

export async function updateTask(id: number, body: TaskPayload) {
  await showToast(ToastStyle.Animated, "Updating task");

  return axiosInstance
    .post(`tasks/${id}`, body)
    .then(() => showToast(ToastStyle.Success, "Task updated"))
    .catch((error) => showApiToastError({ error, title: "Failed to update task", message: error.message }));
}

export async function deleteTask(id: number) {
  await showToast(ToastStyle.Animated, "Deleting task");

  return axiosInstance
    .delete(`tasks/${id}`)
    .then(() => showToast(ToastStyle.Success, "Task deleted"))
    .catch((error) => showApiToastError({ error, title: "Failed to delete task", message: error.message }));
}

interface FetchResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: AxiosError | undefined;
}

const fetcher = (path: string) => axiosInstance.get(path).then((res) => res.data);

export function useFetch<T>(path: string): FetchResult<T> {
  const { data, error } = useSWR<T, AxiosError>(path, fetcher);

  const isLoading = !error && !data;

  return { data, isLoading, error: isLoading ? undefined : error };
}
