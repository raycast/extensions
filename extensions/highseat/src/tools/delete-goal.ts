import { Action } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { api, highseat } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The goal's id, from the goals list. */
  id: string
}

export default withAccessToken(highseat)(async ({ site, id }: Input) => {
  await api.delete("/sites/{site}/goals/{id}", { path: { site, id } })
  return { deleted: id }
})

export const confirmation = withAccessToken(highseat)(async ({ site, id }: Input) => {
  const { data: goal } = await api.get("/sites/{site}/goals/{id}", { path: { site, id } })
  const label = goal.name

  return {
    style: Action.Style.Destructive,
    message: `Delete this goal from ${site}? This cannot be undone.`,
    info: [
      { name: "Site", value: site },
      { name: "Goal", value: label },
    ],
  }
})
