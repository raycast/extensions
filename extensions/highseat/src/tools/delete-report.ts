import { Action } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { api, highseat } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The report's id, from the reports list. */
  id: string
}

export default withAccessToken(highseat)(async ({ site, id }: Input) => {
  await api.delete("/sites/{site}/reports/{id}", { path: { site, id } })
  return { deleted: id }
})

export const confirmation = withAccessToken(highseat)(async ({ site, id }: Input) => {
  const { data: report } = await api.get("/sites/{site}/reports/{id}", { path: { site, id } })
  const label = report.name

  return {
    style: Action.Style.Destructive,
    message: `Delete this report from ${site}? This cannot be undone.`,
    info: [
      { name: "Site", value: site },
      { name: "Report", value: label },
    ],
  }
})
