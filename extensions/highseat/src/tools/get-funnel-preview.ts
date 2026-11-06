import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
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
  /** Repeatable funnel step, written type:match, in order: 2–8 of them. The type is `page` (a path, `*` wildcards allowed) or `event` (the exact event name). Only the first colon separates. Example: step=page:/pricing&step=event:Signup. */
  step: string[]
  /** Hours allowed between the first and the last step, 1–2160. Defaults to 24. */
  windowHours?: number
  /** Count a visitor across sessions (`visitor`), or each session on its own (`session`). */
  unit?: "visitor" | "session"
}

export default withAccessToken(highseat)(async ({ site, ...query }: Input) => {
  return request("get", "/sites/{site}/funnel-preview", { path: { site }, query })
})
