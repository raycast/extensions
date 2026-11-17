import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The funnel's id, from the funnels list. */
  id: string
  /** day, week, month or year (positioned by `date`), a window ending now (30m, 24h, 7d, 2w, 3mo), all, or custom with `from` and `to`. Default 7d. */
  period?: string
  /** The day a unit period falls on, as YYYY-MM-DD. Default today. */
  date?: string
  /** A custom range's first day, inclusive, as YYYY-MM-DD. */
  from?: string
  /** A custom range's last day, inclusive, as YYYY-MM-DD. */
  to?: string
  /** Filters written dimension[.key]:operator:value, all of which match. Example: country:is:DE. */
  filter?: string[]
  /** Split every step by this dimension instead of returning one overall row. */
  breakdown?: "referrer_source" | "country" | "device_type"
  /** Breakdown rows to return, by first-step size. 1–50. */
  limit?: number
  /** Count a visitor across sessions, or each session. Absent: the funnel's own. */
  unit?: "visitor" | "session"
}

export default withAccessToken(highseat)(async ({ site, id, ...query }: Input) => {
  return request("get", "/sites/{site}/funnels/{id}", { path: { site, id }, query })
})
