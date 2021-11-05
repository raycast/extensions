import { setLocalStorageItem, getLocalStorageItem, removeLocalStorageItem } from "@raycast/api"
import type { ProjectFiles } from "./types"

export async function storeFiles(projectFiles: ProjectFiles[]) {
  const data = JSON.stringify(projectFiles)
  await setLocalStorageItem("PROJECT_FILES", data)
}

export async function loadFiles() {
  const PROJECT_FILES_CACHE_KEY = "PROJECT_FILES"

  const data: string | undefined = await getLocalStorageItem(PROJECT_FILES_CACHE_KEY)
  return data !== undefined ? JSON.parse(data) : undefined
}

export async function clearFiles() {
  const PROJECT_FILES_CACHE_KEY = "PROJECT_FILES"

  return await removeLocalStorageItem(PROJECT_FILES_CACHE_KEY)
}
