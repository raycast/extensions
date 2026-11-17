import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The report's id, from the reports list. */
  id: string
  /** day, week, month or year (positioned by `date`), a window ending now (30m, 24h, 7d, 2w, 3mo), all, or custom with `from` and `to`. Default 7d. */
  period?: string
  /** The day a unit period falls on, as YYYY-MM-DD. Default today. */
  date?: string
  /** A custom range's first day, inclusive, as YYYY-MM-DD. */
  from?: string
  /** A custom range's last day, inclusive, as YYYY-MM-DD. */
  to?: string
  /** A list's page size, 1–500, default 20. */
  limit?: number
  /** The previous page's `nextCursor`. */
  cursor?: string
}

export default withAccessToken(highseat)(async ({ site, id, ...query }: Input) => {
  return request("get", "/sites/{site}/reports/{id}/results", { path: { site, id }, query })
})
