import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The funnel's name, as the funnels page lists it. */
  name?: string
  /** 2–8 steps, in order. A page step matches a path, `*` wildcards allowed; an event step matches the exact event name. */
  steps?: {
    type: "page" | "event"
    match: string
  }[]
  /** Hours allowed between the first and the last step, 1–2160. */
  windowHours?: number
  /** Count a visitor across sessions (`visitor`), or each session on its own (`session`). */
  unit?: "visitor" | "session"
  /** The funnel's id, from the funnels list. */
  id?: string
}

export default withAccessToken(highseat)(async ({ site, id, ...body }: Input) => {
  if (id) return request("patch", "/sites/{site}/funnels/{id}", { path: { site, id }, body })
  return request("post", "/sites/{site}/funnels", { path: { site }, body })
})
