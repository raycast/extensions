import { Action } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { api, highseat } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The funnel's id, from the funnels list. */
  id: string
}

export default withAccessToken(highseat)(async ({ site, id }: Input) => {
  await api.delete("/sites/{site}/funnels/{id}", { path: { site, id } })
  return { deleted: id }
})

export const confirmation = withAccessToken(highseat)(async ({ site, id }: Input) => {
  const { data } = await api.get("/sites/{site}/funnels", { path: { site } })
  const funnel = data.find(row => row.id === id)
  const label = funnel?.name ?? id

  return {
    style: Action.Style.Destructive,
    message: `Delete this funnel from ${site}? This cannot be undone.`,
    info: [
      { name: "Site", value: site },
      { name: "Funnel", value: label },
    ],
  }
})
