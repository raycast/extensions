import { LocalStorage } from "@raycast/api"
import path from "node:path"
import { ALL_FOLDERS_VIEW, IMPORTED_IMAGE_FOLDERS_KEY, RECENT_VIEW_FOLDER_KEY } from "./constants"

export function parseStoredFolders(value: string | undefined | null): string[] {
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    if (!Array.isArray(parsed)) return []

    return normalizeFolders(parsed.filter((folder): folder is string => typeof folder === "string"))
  } catch {
    return []
  }
}

export function normalizeFolders(folders: string[]): string[] {
  const uniqueFolders = new Set<string>()

  for (const folder of folders) {
    const trimmedFolder = folder.trim()
    if (!trimmedFolder) continue

    const normalizedFolder = path.resolve(trimmedFolder)
    uniqueFolders.add(normalizedFolder)
  }

  return [...uniqueFolders]
}

export async function getImportedFolders(): Promise<string[]> {
  return parseStoredFolders(await LocalStorage.getItem<string>(IMPORTED_IMAGE_FOLDERS_KEY))
}

export async function setImportedFolders(folders: string[]): Promise<string[]> {
  const normalizedFolders = normalizeFolders(folders)
  await LocalStorage.setItem(IMPORTED_IMAGE_FOLDERS_KEY, JSON.stringify(normalizedFolders))
  return normalizedFolders
}

export async function clearImportedFolders(): Promise<void> {
  await Promise.all([
    LocalStorage.removeItem(IMPORTED_IMAGE_FOLDERS_KEY),
    LocalStorage.removeItem(RECENT_VIEW_FOLDER_KEY),
  ])
}

export async function getRecentViewFolder(folders: string[]): Promise<string> {
  const recentFolder = await LocalStorage.getItem<string>(RECENT_VIEW_FOLDER_KEY)
  return recentFolder && (recentFolder === ALL_FOLDERS_VIEW || folders.includes(recentFolder))
    ? recentFolder
    : ALL_FOLDERS_VIEW
}

export async function setRecentViewFolder(folder: string): Promise<void> {
  await LocalStorage.setItem(RECENT_VIEW_FOLDER_KEY, folder)
}
