import { Color } from "@raycast/api"
import type { ApiResult } from "highseat/api"
import { formatChange, formatCount, formatDuration, formatMoney, formatPercent } from "./format"

interface OverviewFigure {
  title: string
  value: string
  change?: string
  /** True when a lower figure is the good direction, as for a bounce rate. */
  lowerIsBetter?: boolean
}

export function getChangeColor(change: string, lowerIsBetter?: boolean) {
  if (change === "0%") return Color.SecondaryText
  return change.startsWith("+") === !lowerIsBetter ? Color.Green : Color.Red
}

/** The labelled figures of a site's overview, each with its change against the previous range. */
export function getOverviewFigures({ data, meta }: ApiResult<"/sites/{site}/overview">) {
  const { previous } = data
  const figures: OverviewFigure[] = [
    {
      title: "Visitors",
      value: formatCount(data.visitors),
      change: formatChange(data.visitors, previous?.visitors),
    },
    {
      title: "Pageviews",
      value: formatCount(data.pageviews),
      change: formatChange(data.pageviews, previous?.pageviews),
    },
    {
      title: "Sessions",
      value: formatCount(data.sessions),
      change: formatChange(data.sessions, previous?.sessions),
    },
    {
      title: "Bounce Rate",
      value: formatPercent(data.bounceRate),
      change: formatChange(data.bounceRate, previous?.bounceRate),
      lowerIsBetter: true,
    },
    {
      title: "Session Duration",
      value: formatDuration(data.avgDuration),
      change: formatChange(data.avgDuration, previous?.avgDuration),
    },
  ]

  if (!data.hasRevenue) return figures

  return [
    ...figures,
    {
      title: "Revenue",
      value: formatMoney(data.revenue, meta.currency),
      change: formatChange(data.revenue, previous?.revenue),
    },
  ]
}
