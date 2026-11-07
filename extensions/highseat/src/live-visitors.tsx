import { environment, Icon, Keyboard, launchCommand, LaunchType, MenuBarExtra, open } from "@raycast/api"
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils"
import { findSelectedSite, getSiteIcon, SiteOverview } from "./components/site-picker"
import { formatCount } from "./lib/format"
import { api, APP_URL, cache, isConnected, LIVE_SITES_KEY } from "./lib/highseat"

async function fetchOverviews(siteId: string | undefined) {
  const { data: sites } = await api.get("/sites/overview")
  cache.set(LIVE_SITES_KEY, JSON.stringify(sites))
  return { connected: true as const, sites, site: findSelectedSite(sites, siteId) }
}

/**
 * A menu bar command also runs in the background, so it never starts a sign-in on its own. Without
 * a connection it offers one, and the person opens the browser by choosing it.
 */
async function fetchLive(siteId: string | undefined) {
  if (!(await isConnected())) return { connected: false as const }

  // Opening the menu reads every site in one call. A background refresh reads only the menu bar's site.
  const cached = cache.get(LIVE_SITES_KEY)
  if (environment.launchType !== LaunchType.Background || !cached) return fetchOverviews(siteId)

  const sites: SiteOverview[] = JSON.parse(cached)
  const site = findSelectedSite(sites, siteId)
  if (!site) return fetchOverviews(siteId)

  try {
    const realtime = await api.get("/sites/{site}/realtime", { path: { site: site.id } })
    return { connected: true as const, sites, site: { ...site, online: realtime.data.visitors } }
  } catch {
    // The cached site may be gone from the connection, so the list is read again.
    return fetchOverviews(siteId)
  }
}

export default function LiveVisitors() {
  const [siteId, setSiteId] = useCachedState<string | undefined>("site-id", undefined)
  const { data, isLoading } = useCachedPromise(fetchLive, [siteId])

  if (data && !data.connected) {
    return (
      <MenuBarExtra icon={Icon.BarChart} isLoading={isLoading} tooltip="Highseat">
        <MenuBarExtra.Item
          title="Connect Highseat"
          onAction={async () => {
            try {
              await launchCommand({ name: "view-sites", type: LaunchType.UserInitiated })
            } catch (error) {
              await showFailureToast(error, { title: "Could not open View Sites" })
            }
          }}
        />
      </MenuBarExtra>
    )
  }

  const site = data?.site

  return (
    <MenuBarExtra
      icon={{ source: "icon.png" }}
      title={site && formatCount(site.online)}
      tooltip={site ? `Visitors on ${site.name} right now` : "Highseat"}
      isLoading={isLoading}
    >
      {site && (
        <MenuBarExtra.Section title={site.name}>
          <MenuBarExtra.Item title={`${formatCount(site.online)} right now`} />
          <MenuBarExtra.Item title={`${formatCount(site.visitors)} in the last 24 hours`} />
          <MenuBarExtra.Item
            title="Open Dashboard"
            icon={Icon.Globe}
            shortcut={Keyboard.Shortcut.Common.Open}
            onAction={() => open(`${APP_URL}/${site.domain}/realtime`)}
          />
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section title="All Sites">
        {data?.sites.map(row => (
          <MenuBarExtra.Item
            key={row.id}
            icon={getSiteIcon(row)}
            title={row.name}
            subtitle={`${formatCount(row.online)} now · ${formatCount(row.visitors)} in 24 hours`}
            tooltip={`Show ${row.name} in the menu bar`}
            onAction={() => setSiteId(row.id)}
          />
        ))}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  )
}
