import { Action, ActionPanel, Keyboard, List } from "@raycast/api"
import type { ReactElement } from "react"
import { useCachedPromise, useCachedState } from "@raycast/utils"
import { formatCount, formatCountry } from "../lib/format"
import { api, APP_URL } from "../lib/highseat"
import { getChangeColor, getOverviewFigures } from "../lib/overview"
import { DEFAULT_PERIOD, getCompare } from "../lib/periods"
import { LoadError, RefreshAction } from "./load-state"
import { PeriodDropdown } from "./period-dropdown"
import { Site, SwitchSiteAction } from "./site-picker"

const ROWS_PER_SECTION = 5

interface SiteStatsProps {
  site: Site
  sites?: Site[]
  onSwitchSite?: (siteId: string) => void
}

interface StatItemProps {
  title: string
  value: string
  change?: string
  /** True when a lower figure is the good direction, as for a bounce rate. */
  lowerIsBetter?: boolean
  actions: ReactElement
}

function StatItem({ title, value, change, lowerIsBetter, actions }: StatItemProps) {
  return (
    <List.Item
      title={title}
      accessories={[
        ...(change ? [{ tag: { value: change, color: getChangeColor(change, lowerIsBetter) } }] : []),
        { text: value },
      ]}
      actions={actions}
    />
  )
}

async function fetchStats(site: string, period: string) {
  const compare = getCompare(period)
  const limit = ROWS_PER_SECTION
  const [overview, pages, sources, countries] = await Promise.all([
    api.get("/sites/{site}/overview", { path: { site }, query: { period, compare } }),
    api.get("/sites/{site}/pages", { path: { site }, query: { period, limit } }),
    api.get("/sites/{site}/sources", { path: { site }, query: { period, limit } }),
    api.get("/sites/{site}/locations", { path: { site }, query: { period, limit } }),
  ])

  return { overview, pages: pages.data, sources: sources.data, countries: countries.data }
}

export function SiteStats({ site, sites = [], onSwitchSite }: SiteStatsProps) {
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)
  const { data, isLoading, error, revalidate } = useCachedPromise(fetchStats, [site.id, period], {
    keepPreviousData: true,
  })

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Dashboard"
        url={`${APP_URL}/${site.domain}`}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <RefreshAction onRefresh={revalidate} />
      {onSwitchSite && <SwitchSiteAction sites={sites} onSelect={onSwitchSite} />}
    </ActionPanel>
  )

  return (
    <List
      isLoading={isLoading}
      navigationTitle={site.name}
      searchBarPlaceholder={`Filter ${site.domain}`}
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
    >
      {error && !isLoading && <LoadError error={error} actions={actions} />}
      {data && (
        <List.Section title="Overview">
          {getOverviewFigures(data.overview).map(figure => (
            <StatItem key={figure.title} {...figure} actions={actions} />
          ))}
        </List.Section>
      )}
      <List.Section title="Top Pages">
        {data?.pages.map(page => (
          <StatItem key={page.path} title={page.path} value={formatCount(page.visitors)} actions={actions} />
        ))}
      </List.Section>
      <List.Section title="Top Sources">
        {data?.sources.map(source => (
          // An empty name is direct traffic.
          <StatItem
            key={source.name}
            title={source.name || "Direct"}
            value={formatCount(source.visitors)}
            actions={actions}
          />
        ))}
      </List.Section>
      <List.Section title="Top Countries">
        {data?.countries.map(country => (
          // An empty name is a visitor whose country could not be resolved.
          <StatItem
            key={country.name}
            title={country.name ? formatCountry(country.name) : "Unknown"}
            value={formatCount(country.visitors)}
            actions={actions}
          />
        ))}
      </List.Section>
    </List>
  )
}
