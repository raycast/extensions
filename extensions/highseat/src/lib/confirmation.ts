import { withAccessToken } from "@raycast/utils"
import { api, highseat, request } from "./highseat"

interface CurrentRow {
  data: { name?: string; text?: string }
}

/** The rows of a confirmation: each field a save would write, as Raycast shows it. */
export function getChangeInfo(changes: object) {
  return Object.entries(changes).map(([name, value]) => ({
    name,
    value: typeof value === "string" ? value : JSON.stringify(value),
  }))
}

/** The row an update would change, by its name or text. */
async function getCurrentLabel(noun: string, site: string, id: string) {
  // A funnel's own route evaluates it, so its name comes from the list.
  if (noun === "funnel") {
    const { data } = await api.get("/sites/{site}/funnels", { path: { site } })
    return data.find(funnel => funnel.id === id)?.name ?? id
  }

  const row = (await request("get", `/sites/{site}/${noun}s/{id}`, { path: { site, id } })) as CurrentRow
  return row.data.name ?? row.data.text ?? id
}

/** Shows the site and the row a save tool targets, because Raycast's prompt shows only these rows. */
export function confirmSave<Input extends { site: string; id?: string }>(noun: string) {
  return withAccessToken(highseat)(async ({ site, id, ...changes }: Input) => ({
    message: `${id ? "Update this" : "Create this"} ${noun} on ${site}?`,
    info: [
      { name: "Site", value: site },
      ...(id ? [{ name: "Current", value: await getCurrentLabel(noun, site, id) }] : []),
      ...getChangeInfo(changes),
    ],
  }))
}
