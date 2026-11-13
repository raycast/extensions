import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The filter dimension to list. A goal's values are the goals report's. */
  dimension:
    | "page_path"
    | "entry_page"
    | "exit_page"
    | "hostname"
    | "country"
    | "region"
    | "city"
    | "browser"
    | "os"
    | "device_type"
    | "referrer_source"
    | "referrer_domain"
    | "referrer_channel"
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_content"
    | "utm_term"
    | "event_name"
    | "property"
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
  /** Page size, largest first. 1–500, default 20. Not a cap on the whole list. */
  limit?: number
  /** The previous page's `nextCursor`. */
  cursor?: string
  /** A property key, for `dimension=property`: list its values. */
  key?: string
  /** Keep the values containing this text, any case. */
  search?: string
}

export default withAccessToken(highseat)(async ({ site, dimension, ...query }: Input) => {
  return request("get", "/sites/{site}/filter-values/{dimension}", { path: { site, dimension }, query })
})
