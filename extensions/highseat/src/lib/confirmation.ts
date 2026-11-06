import { Tool } from "@raycast/api"

/** The rows of a confirmation: each field a save would write, as Raycast shows it. */
export function getChangeInfo(changes: object) {
  return Object.entries(changes).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }))
}

/** Names the site and the row a save tool is about to create or change. */
export function confirmSave<Input extends { site: string; id?: string }>(noun: string): Tool.Confirmation<Input> {
  return async ({ site, id, ...changes }) => ({
    message: `${id ? "Update this" : "Create this"} ${noun} on ${site}?`,
    info: getChangeInfo(changes),
  })
}
