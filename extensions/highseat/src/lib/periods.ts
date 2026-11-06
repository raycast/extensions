export const DEFAULT_PERIOD = "7d"

export const PERIODS = [
  { value: "day", title: "Today" },
  { value: "24h", title: "Last 24 Hours" },
  { value: "7d", title: "Last 7 Days" },
  { value: "30d", title: "Last 30 Days" },
  { value: "month", title: "This Month" },
  { value: "year", title: "This Year" },
  { value: "all", title: "All Time" },
]

export function getPeriodTitle(period: string) {
  return PERIODS.find(({ value }) => value === period)?.title ?? period
}

/** All time has no earlier range to compare with. */
export function getCompare(period: string) {
  return period === "all" ? "off" : "previous"
}
