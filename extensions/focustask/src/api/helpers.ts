import {getPreferenceValues} from "@raycast/api"
import fetch from "node-fetch"
import {ChecklistResponse, CreateTaskResponse, TasksResponse} from "./types"

export const getApiRoot = () => {
  return "https://focustask.app"
}

const preferences = getPreferenceValues()

export const getTasks = () => {
  return fetchJson<TasksResponse>({path: "tasks"})
}

export const createTask = (data: {title: string}) => {
  return fetchJson<CreateTaskResponse>({
    path: "tasks/create",
    method: "post",
    data,
  })
}

export const getChecklists = () => {
  return fetchJson<ChecklistResponse>({path: "lists"})
}

const fetchJson = async <T>({
  path,
  method = "get",
  data,
}: {
  path: string
  method?: "get" | "post"
  data?: Record<string, string>
}): Promise<T | {error: string}> => {
  const url = `${getApiRoot()}/api/${path}`

  try {
    const result = await fetch(url, {
      headers: {
        Authorization: `Token ${preferences.key}`,
        "Content-Type": "application/json",
      },
      method,
      body: data ? JSON.stringify(data) : undefined,
    })

    const json = await result.json()

    return json as T
  } catch (e: any) {
    console.log("error:", e)

    return {error: e.message}
  }
}
