import { getPreferenceValues, showToast, ToastStyle } from "@raycast/api";
import {
  TodoistApi,
  TodoistRequestError,
  AddTaskArgs,
  UpdateTaskArgs,
  AddProjectArgs,
  GetTasksArgs,
} from "@doist/todoist-api-typescript";
import useSWR from "swr";

import { SWRKeys } from "./types";

const preferences = getPreferenceValues();

export const api = new TodoistApi(preferences.token);

interface HandleErrorArgs {
  error: TodoistRequestError | Error;
  title: string;
}

export function handleError({ error, title }: HandleErrorArgs) {
  if (error instanceof TodoistRequestError && error.isAuthenticationError()) {
    return showToast(ToastStyle.Failure, title, "Please, make sure your Todoist token is correct.");
  }

  return showToast(ToastStyle.Failure, title, error.message);
}

export async function createTask(body: AddTaskArgs) {
  await showToast(ToastStyle.Animated, "Creating task");

  return api
    .addTask(body)
    .then(() => showToast(ToastStyle.Success, "Task created"))
    .catch((error) => handleError({ error, title: "Failed to get tasks" }));
}

export async function completeTask(id: number) {
  await showToast(ToastStyle.Animated, "Completing task");

  return api
    .closeTask(id)
    .then(() => showToast(ToastStyle.Success, "Task achieved. Well done! 🙌"))
    .catch((error) => handleError({ error, title: "Failed to complete tasks" }));
}

export async function updateTask(id: number, body: UpdateTaskArgs) {
  await showToast(ToastStyle.Animated, "Updating task");

  return api
    .updateTask(id, body)
    .then(() => showToast(ToastStyle.Success, "Task updated"))
    .catch((error) => handleError({ error, title: "Failed to update tasks" }));
}

export async function deleteTask(id: number) {
  await showToast(ToastStyle.Animated, "Deleting task");

  return api
    .deleteTask(id)
    .then(() => showToast(ToastStyle.Success, "Task deleted"))
    .catch((error) => handleError({ error, title: "Failed to delete task" }));
}

export async function createProject(body: AddProjectArgs) {
  await showToast(ToastStyle.Animated, "Creating project");

  return api
    .addProject(body)
    .then(() => showToast(ToastStyle.Success, "Project created"))
    .catch((error) => handleError({ error, title: "Failed to create project" }));
}

export async function deleteProject(id: number) {
  await showToast(ToastStyle.Animated, "Deleting project");

  return api
    .deleteProject(id)
    .then(() => showToast(ToastStyle.Success, "Project deleted"))
    .catch((error) => handleError({ error, title: "Failed to delete project" }));
}

export function getProjects() {
  return useSWR(SWRKeys.projects, () => api.getProjects());
}

export function getTasks(params: GetTasksArgs) {
  return useSWR(SWRKeys.tasks, () => api.getTasks(params));
}

export function getLabels() {
  return useSWR(SWRKeys.labels, () => api.getLabels());
}

export function getSections(id: number) {
  return useSWR(SWRKeys.sections, () => api.getSections(id));
}
