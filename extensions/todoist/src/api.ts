import { preferences, showToast, ToastStyle } from "@raycast/api";
import axios, { AxiosError } from "axios";
import useSWR from "swr";
import { TaskPayload } from "./types";

export const axiosInstance = axios.create({
  baseURL: "https://api.todoist.com/rest/v1",
  timeout: 1000,
  headers: { Authorization: `Bearer ${preferences.token.value}` },
});

export async function createTask(body: TaskPayload): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Creating task");
  try {
    await axiosInstance.post(`/tasks`, body);
    toast.style = ToastStyle.Success;
    toast.title = "Created task";
  } catch (error) {
    toast.style = ToastStyle.Failure;
    toast.title = "Failed creating task";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}

export async function completeTask(id: number): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Completing task");
  try {
    await axiosInstance.post(`/tasks/${id}/close`);
    toast.style = ToastStyle.Success;
    toast.title = "Task achieved. Well done! 🙌";
  } catch (error) {
    toast.style = ToastStyle.Failure;
    toast.title = "Failed completing task";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}

export async function updateTask(id: number, body: TaskPayload): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Updating task");
  try {
    await axiosInstance.post(`tasks/${id}`, body);
    toast.style = ToastStyle.Success;
    toast.title = "Task updated";
  } catch (error) {
    toast.style = ToastStyle.Failure;
    toast.title = "Failed updating task";
    toast.message = error instanceof Error ? error.message : undefined;
  }
}

export async function deleteTask(id: number): Promise<void> {
  const toast = await showToast(ToastStyle.Animated, "Deleting task");
  try {
    await axiosInstance.delete(`/tasks/${id}`);
    toast.style = ToastStyle.Success;
    toast.title = "Task deleted";
  } catch (error) {
    toast.style = ToastStyle.Failure;
    toast.title = "Failed deleting task";
    toast.message = error instanceof Error ? error.message : undefined;
  }
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
