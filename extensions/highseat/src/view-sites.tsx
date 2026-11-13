import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast, updateCommandMetadata } from "@raycast/api"
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils"
import type { ApiResult } from "highseat/api"
import { useEffect, useState } from "react"
import { RefreshAction, SitesEmptyView } from "./components/load-state"
import { PeriodDropdown } from "./components/period-dropdown"
import { getSiteIcon, SiteOverview } from "./components/site-picker"
import { SiteStats } from "./components/site-stats"
import { formatCount } from "./lib/format"
import { api, APP_URL, disconnect, highseat } from "./lib/highseat"
import { getChangeColor, getOverviewFigures } from "./lib/overview"
import { DEFAULT_PERIOD, getCompare, getPeriodTitle } from "./lib/periods"

type Overview = ApiResult<"/sites/{site}/overview">

interface SiteDetailProps {
  site: SiteOverview
  period: string
  data?: Overview
  error?: Error
  isLoading: boolean
}

function SiteDetail({ site, period, data, error, isLoading }: SiteDetailProps) {
  return (
    <List.Item.Detail
      isLoading={isLoading}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title={site.domain} text={getPeriodTitle(period)} />
          <List.Item.Detail.Metadata.Label title="Visitors in the Last 24 Hours" text={formatCount(site.visitors)} />
          <List.Item.Detail.Metadata.Separator />
          {error && !data && (
            <List.Item.Detail.Metadata.Label title="Could not load" text={{ value: error.message, color: Color.Red }} />
          )}
          {data &&
            getOverviewFigures(data).map(({ title, value, change, lowerIsBetter }) => (
              // Raycast keeps a row's old width when its text changes, which cuts off a longer figure.
              <List.Item.Detail.Metadata.TagList key={`${title}-${value}-${change}`} title={title}>
                <List.Item.Detail.Metadata.TagList.Item text={value} />
                {change && (
                  <List.Item.Detail.Metadata.TagList.Item text={change} color={getChangeColor(change, lowerIsBetter)} />
                )}
              </List.Item.Detail.Metadata.TagList>
            ))}
        </List.Item.Detail.Metadata>
      }
    />
  )
}

interface SiteItemProps {
  site: SiteOverview
  period: string
  isSelected: boolean
  onRefresh: () => void
}

/** Every row keeps its cached figures on screen, and only the selected row calls the API. */
function SiteItem({ site, period, isSelected, onRefresh }: SiteItemProps) {
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (siteId: string, range: string) =>
      api.get("/sites/{site}/overview", {
        path: { site: siteId },
        query: { period: range, compare: getCompare(range) },
      }),
    [site.id, period],
    { execute: isSelected, keepPreviousData: isSelected },
  )

  return (
    <List.Item
      id={site.id}
      icon={getSiteIcon(site)}
      title={site.name}
      keywords={[site.domain]}
      detail={<SiteDetail site={site} period={period} data={data} error={error} isLoading={isLoading} />}
      actions={
        <ActionPanel>
          <Action.Push title="View Stats" icon={Icon.BarChart} target={<SiteStats site={site} title={site.name} />} />
          <Action.OpenInBrowser
            title="Open Dashboard"
            url={`${APP_URL}/${site.domain}`}
            shortcut={Keyboard.Shortcut.Common.Open}
          />
          <Action.CopyToClipboard title="Copy Domain" content={site.domain} shortcut={Keyboard.Shortcut.Common.Copy} />
          <RefreshAction
            onRefresh={() => {
              onRefresh()
              revalidate()
            }}
          />
          <Action
            title="Disconnect Highseat"
            icon={Icon.Logout}
            style={Action.Style.Destructive}
            onAction={async () => {
              await disconnect()
              await updateCommandMetadata({ subtitle: null })
              await showToast({ style: Toast.Style.Success, title: "Disconnected from Highseat" })
            }}
          />
        </ActionPanel>
      }
    />
  )
}

function ViewSites() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => api.get("/sites/overview"))
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const sites = data?.data ?? []
  const activeId = selectedId ?? sites[0]?.id

  useEffect(() => {
    if (!data) return
    const visitors = data.data.reduce((total, site) => total + site.visitors, 0)
    void updateCommandMetadata({ subtitle: `Highseat · ${formatCount(visitors)} in 24 hours` })
  }, [data])

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search sites"
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
      onSelectionChange={setSelectedId}
    >
      <SitesEmptyView error={error} isLoading={isLoading} onRefresh={revalidate} />
      {sites.map(site => (
        <SiteItem key={site.id} site={site} period={period} isSelected={site.id === activeId} onRefresh={revalidate} />
      ))}
    </List>
  )
}

export default withAccessToken(highseat)(ViewSites)
