import { List } from "@raycast/api"
import { withAccessToken } from "@raycast/utils"
import { SitesEmptyView } from "./components/load-state"
import { useSelectedSite } from "./components/site-picker"
import { SiteStats } from "./components/site-stats"
import { highseat } from "./lib/highseat"

function ViewStats() {
  const { sites, site, setSiteId, isLoading, error, revalidate } = useSelectedSite()

  if (!site) {
    return (
      <List isLoading={isLoading}>
        <SitesEmptyView error={error} isLoading={isLoading} onRefresh={revalidate} />
      </List>
    )
  }

  // The key keeps one site's figures from showing under another site's name while they load.
  return <SiteStats key={site.id} site={site} sites={sites} onSwitchSite={setSiteId} />
}

export default withAccessToken(highseat)(ViewStats)
