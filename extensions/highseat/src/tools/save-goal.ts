import { withAccessToken } from "@raycast/utils"
import { confirmSave } from "../lib/confirmation"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The goal's name, as the Goals card shows it. */
  name?: string
  /** `page` counts a pageview, `event` a custom event. */
  type?: "page" | "event"
  /** A page goal's path, `*` wildcards allowed, or an event goal's exact event name. A path is stored with a leading slash and no trailing one. */
  match?: string
  /** The goal's id, from the goals list. */
  id?: string
}

export default withAccessToken(highseat)(async ({ site, id, ...body }: Input) => {
  if (id) return request("patch", "/sites/{site}/goals/{id}", { path: { site, id }, body })
  return request("post", "/sites/{site}/goals", { path: { site }, body })
})

export const confirmation = confirmSave<Input>("goal")
