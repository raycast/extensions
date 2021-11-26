import { preferences, showToast, ToastStyle, Toast } from "@raycast/api";
import axios, { AxiosError } from "axios";
import useSWR from "swr";
import { TaskPayload } from "./types";

export const axiosInstance = axios.create({
  baseURL: "https://api.todoist.com/rest/v1",
  headers: { Authorization: `Bearer ${preferences.token.value}` },
});

interface HandleSuccessParams {
  toast: Toast;
  title: string;
}

export function handleSuccess({ toast, title }: HandleSuccessParams) {
  toast.style = ToastStyle.Success;
  toast.title = title;
}

interface HandleErrorParams {
  error: AxiosError;
  toast: Toast;
  title: string;
  message: string;
}

export function handleError({ error, toast, title, message }: HandleErrorParams) {
  toast.style = ToastStyle.Failure;

  if (error.response?.status === 401) {
    toast.title = "Unauthorized";
    toast.message = "Please check your Todoist token";
    return;
  }

  toast.title = title;
  toast.message = message;
}

export async function createTask(body: TaskPayload): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Creating task");

  return axiosInstance
    .post("/tasks", body)
    .then(() => handleSuccess({ toast, title: "Task created" }))
    .catch((error) => handleError({ error, toast, title: "Failed to create task", message: error.message }));
}

export async function completeTask(id: number): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Completing task");

  return axiosInstance
    .post(`/tasks/${id}/close`)
    .then(() => handleSuccess({ toast, title: "Task achieved. Well done! 🙌" }))
    .catch((error) => handleError({ error, toast, title: "Failed to complete task", message: error.message }));
}

export async function updateTask(id: number, body: TaskPayload): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Updating task");

  return axiosInstance
    .post(`tasks/${id}`, body)
    .then(() => handleSuccess({ toast, title: "Task updated" }))
    .catch((error) => handleError({ error, toast, title: "Failed to update task", message: error.message }));
}

export async function deleteTask(id: number): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Deleting task");

  return axiosInstance
    .delete(`tasks/${id}`)
    .then(() => handleSuccess({ toast, title: "Task deleted" }))
    .catch((error) => handleError({ error, toast, title: "Failed to delete task", message: error.message }));
}

interface FetchResult<T> {
  data: T | undefined;
  isLoading: boolean;
}

const fetcher = (path: string) => axiosInstance.get(path).then((res) => res.data);

export function useFetch<T>(path: string): FetchResult<T> {
  const { data, error } = useSWR<T, AxiosError>(path, fetcher);

  return { data, isLoading: !error && !data };
}
