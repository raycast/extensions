import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** Page paths or custom event names. */
  kind: "page" | "event"
  /** Keep the names containing this text, any case. */
  search?: string
  /** Page size, largest first. 1–500, default 20. Not a cap on the whole list. */
  limit?: number
  /** The previous page's `nextCursor`. */
  cursor?: string
}

export default withAccessToken(highseat)(async ({ site, kind, ...query }: Input) => {
  return request("get", "/sites/{site}/catalog/{kind}", { path: { site, kind }, query })
})
