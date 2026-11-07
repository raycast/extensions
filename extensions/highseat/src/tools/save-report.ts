import { withAccessToken } from "@raycast/utils"
import { confirmSave } from "../lib/confirmation"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The site's domain as registered, or its id. */
  site: string
  /** The tile's title. */
  name?: string
  /** trend charts the metric over time; list ranks the rows of one dimension. */
  type?: "trend" | "list"
  /** What a trend charts per bucket. `events` counts the event each series names. A list ranks by its dimension's own count, as its dashboard card does. */
  metric?: "visitors" | "sessions" | "pageviews" | "events" | "bounceRate" | "avgDuration" | "revenue"
  /** A list's rows: a filter dimension a dashboard card lists (page_path, entry_page, exit_page, hostname, country, region, city, browser, os, device_type, referrer_source, referrer_channel, utm_*, event_name), or property. "none" for a trend. */
  dimension?:
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
    | "goal"
    | "property"
    | "none"
  /** The event property a list by `property` ranks the values of. "none" otherwise. */
  propertyKey?: string
  /** One to 3 series for a trend, each drawn as its own line of the same metric; exactly one for a list, whose filters narrow its rows. An `events` trend names its event on every series with `event_name:is:<name>` or `goal.event:is:<name>`. */
  series?: {
    /** The line's name in the legend. Empty names it by its filters' values. */
    label?: string
    /** The filters the line counts under, in the grammar `filter=` takes, dimension[.key]:operator:value. All have to match. */
    filters?: string[]
  }[]
  /** The range the tile always reads: a calendar period (day, week, month, year), all, or a window of an hour or more (24h, 30d, 3mo). "none" follows the Reports page's picker. */
  period?: string
  /** A trend's bucket size. "none" follows the range's length, as the dashboard's chart does. */
  granularity?: "hour" | "day" | "week" | "month" | "none"
  /** Whether a list's tile shows its revenue column, once the site has sold. A display choice: the report's results carry each row's revenue either way. */
  showRevenue?: boolean
  /** The report's id, from the reports list. */
  id?: string
  /** Moves the report to this place in the grid, counted from 0, and renumbers the others around it. A number past the end puts it last. */
  position?: number
}

/** The fields the API stores as null. Raycast's tool inputs cannot be null, so "none" clears them. */
const NULLABLE_FIELDS = ["dimension", "propertyKey", "period", "granularity"]

function clearNone(fields: object) {
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [
      name,
      NULLABLE_FIELDS.includes(name) && value === "none" ? null : value,
    ]),
  )
}

export default withAccessToken(highseat)(async ({ site, id, ...fields }: Input) => {
  const body = clearNone(fields)
  if (id) return request("patch", "/sites/{site}/reports/{id}", { path: { site, id }, body })
  return request("post", "/sites/{site}/reports", { path: { site }, body })
})

export const confirmation = confirmSave<Input>("report")
