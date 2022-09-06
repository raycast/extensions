import {useCachedPromise} from "@raycast/utils"
import {getChecklists, getTasks} from "./helpers"

export const useFetchTasks = () => {
  const {isLoading, data} = useCachedPromise(() => getTasks())
  const tasks = data && "tasks" in data ? data.tasks : []
  const error = data && "error" in data ? data.error : null

  return {tasks, isLoading, error}
}

export const useFetchLists = () => {
  const {isLoading, data} = useCachedPromise(() => getChecklists())
  const lists = data && "lists" in data ? data.lists : []
  const error = data && "error" in data ? data.error : null

  return {lists, isLoading, error}
}
