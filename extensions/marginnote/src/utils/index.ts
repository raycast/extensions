import { getApplications } from "@raycast/api"

export * from "./date"
export * from "./applescript"

export function escape(str: string) {
  return str.replace(/[\\"]/g, "\\$&")
}

export const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr))

export const isMarginNoteInstalled = async () =>
  (await getApplications()).find(k => k.name === "MarginNote 3") !== undefined
