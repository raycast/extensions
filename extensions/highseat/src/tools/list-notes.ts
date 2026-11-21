import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** A custom range's first day, inclusive, as YYYY-MM-DD. */
  from?: string
  /** A custom range's last day, inclusive, as YYYY-MM-DD. */
  to?: string
  /** Page size, newest first. 1–500, default 20. */
  limit?: number
  /** The previous page's `nextCursor`. */
  cursor?: string
}

export default withAccessToken(highseat)(async ({ site, ...query }: Input) => {
  return request("get", "/sites/{site}/notes", { path: { site }, query })
})
