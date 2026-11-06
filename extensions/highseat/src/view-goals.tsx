import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api"
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils"
import { LoadError, RefreshAction } from "./components/load-state"
import { PeriodDropdown } from "./components/period-dropdown"
import { SwitchSiteAction, useSelectedSite } from "./components/site-picker"
import { formatCount, formatPercent } from "./lib/format"
import { api, APP_URL, highseat } from "./lib/highseat"
import { DEFAULT_PERIOD } from "./lib/periods"

function ViewGoals() {
  const { sites, site, setSiteId, isLoading: isLoadingSites } = useSelectedSite()
  const [period, setPeriod] = useCachedState("period", DEFAULT_PERIOD)
  const { data, isLoading, error, revalidate } = useCachedPromise(
    (siteId: string, range: string) =>
      api.get("/sites/{site}/goals/conversions", { path: { site: siteId }, query: { period: range } }),
    [site?.id ?? "", period],
    { execute: Boolean(site), keepPreviousData: true },
  )

  const actions = (
    <ActionPanel>
      <Action.OpenInBrowser
        title="Open Dashboard"
        url={site ? `${APP_URL}/${site.domain}` : APP_URL}
        shortcut={Keyboard.Shortcut.Common.Open}
      />
      <RefreshAction onRefresh={revalidate} />
      <SwitchSiteAction sites={sites} onSelect={setSiteId} />
    </ActionPanel>
  )

  return (
    <List
      isLoading={isLoading || isLoadingSites}
      navigationTitle={site?.name}
      searchBarPlaceholder="Filter goals"
      searchBarAccessory={<PeriodDropdown value={period} onChange={setPeriod} />}
    >
      {error && !isLoading ? (
        <LoadError error={error} actions={actions} />
      ) : (
        <List.EmptyView
          icon={Icon.BullsEye}
          title="No goals yet"
          description="Add one in the dashboard, or ask Raycast AI to create it."
          actions={actions}
        />
      )}
      {data?.data.map(goal => (
        <List.Item
          key={goal.id}
          icon={goal.type === "page" ? Icon.Document : Icon.Bolt}
          title={goal.name}
          subtitle={goal.match}
          accessories={[
            { text: formatCount(goal.visitors), tooltip: "Visitors who converted" },
            { tag: formatPercent(goal.rate), tooltip: "Conversion rate" },
          ]}
          actions={actions}
        />
      ))}
    </List>
  )
}

export default withAccessToken(highseat)(ViewGoals)
