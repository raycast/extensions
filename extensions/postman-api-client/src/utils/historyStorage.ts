import { LocalStorage } from "@raycast/api"
import { HistoryEntry } from "../types"

const HISTORY_KEY = "request_history"
const MAX_HISTORY_ENTRIES = 20

export const saveHistoryEntry = async (
  entry: Omit<HistoryEntry, "id" | "timestamp">
): Promise<void> => {
  try {
    const history = await getHistory()
    const newEntry: HistoryEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    // Add to beginning and limit to MAX_HISTORY_ENTRIES
    const updatedHistory = [newEntry, ...history].slice(0, MAX_HISTORY_ENTRIES)
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
  } catch (error) {
    console.error("Failed to save history entry:", error)
  }
}

export const getHistory = async (): Promise<HistoryEntry[]> => {
  try {
    const historyJson = await LocalStorage.getItem<string>(HISTORY_KEY)
    if (!historyJson) {
      return []
    }
    return JSON.parse(historyJson) as HistoryEntry[]
  } catch (error) {
    console.error("Failed to get history:", error)
    return []
  }
}

export const clearHistory = async (): Promise<void> => {
  try {
    await LocalStorage.removeItem(HISTORY_KEY)
  } catch (error) {
    console.error("Failed to clear history:", error)
  }
}

export const deleteHistoryEntry = async (id: string): Promise<void> => {
  try {
    const history = await getHistory()
    const updatedHistory = history.filter((entry) => entry.id !== id)
    await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory))
  } catch (error) {
    console.error("Failed to delete history entry:", error)
  }
}
