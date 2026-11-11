import { withAccessToken } from "@raycast/utils"
import { highseat, request } from "../lib/highseat"

type Input = {
  /** The report to read, one of the dashboard's cards. The tool description lists what each returns. */
  report:
    | "realtime"
    | "overview"
    | "timeseries"
    | "pages"
    | "sources"
    | "devices"
    | "locations"
    | "campaigns"
    | "events"
    | "event"
    | "bots"
    | "tool_calls"
    | "goals"
    | "revenue"
    | "products"
    | "attribution"
    | "properties"
  /** The site's domain as registered, or its id. */
  site: string
  /** day, week, month or year (positioned by `date`), a window ending now (30m, 24h, 7d, 2w, 3mo), all, or custom with `from` and `to`. Default 7d. */
  period?: string
  /** The day a unit period falls on. Default today. */
  date?: string
  /** A custom range's first day, inclusive. */
  from?: string
  /** A custom range's last day, inclusive. */
  to?: string
  /** dimension[.key]:operator:value, up to 20, all of which match. Dimensions: page_path, entry_page, exit_page, hostname, country, region, city, browser, os, device_type, referrer_source, referrer_domain, referrer_channel, utm_source, utm_medium, utm_campaign, utm_content, utm_term, event_name, goal, property. goal takes a key, page or event (goal.page), and property its key (property.plan). Operators: is, is_not, contains; country, region, goal take is and is_not only. A region is an ISO 3166-2 code. Example: country:is:DE. */
  filter?: string[]
  /** overview, timeseries, revenue: the comparison range. custom starts on `compareFrom`. */
  compare?: "off" | "previous" | "year" | "custom"
  /** A custom comparison's first day. */
  compareFrom?: string
  /** pages: top, entry, exit, not_found, hostnames. sources: referrers, channels. attribution: sources, channels, pages, campaigns, countries. */
  tab?: string
  /** devices: browser, os, device_type. locations: country, region, city. campaigns: utm_campaign, utm_source, utm_medium, utm_content, utm_term. */
  dimension?: string
  /** event: the event's name. properties: narrows to one event. */
  name?: string
  /** properties: one property key. */
  key?: string
  /** timeseries: count this custom event per bucket. */
  event?: string
  /** timeseries: the bucket size. */
  granularity?: "hour" | "day" | "week" | "month"
  /** A list's page size, 1–500, default 20. */
  limit?: number
  /** The previous page's `nextCursor`. */
  cursor?: string
}

const REPORT_PATHS = {
  overview: "/sites/{site}/overview",
  timeseries: "/sites/{site}/timeseries",
  realtime: "/sites/{site}/realtime",
  pages: "/sites/{site}/pages",
  sources: "/sites/{site}/sources",
  devices: "/sites/{site}/devices",
  locations: "/sites/{site}/locations",
  campaigns: "/sites/{site}/campaigns",
  events: "/sites/{site}/events",
  event: "/sites/{site}/events/{name}",
  properties: "/sites/{site}/properties",
  goals: "/sites/{site}/goals/conversions",
  revenue: "/sites/{site}/revenue",
  products: "/sites/{site}/revenue/products",
  attribution: "/sites/{site}/revenue/attribution",
  bots: "/sites/{site}/bots",
  tool_calls: "/sites/{site}/tool-calls",
}

export default withAccessToken(highseat)(async ({ report, site, name, ...query }: Input) => {
  // Only the event report takes the name in its path. The properties report reads it as a filter.
  const route = REPORT_PATHS[report]
  if (report === "event") return request("get", route, { path: { site, name }, query })
  return request("get", route, { path: { site }, query: { ...query, name } })
})
