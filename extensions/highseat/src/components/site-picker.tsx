import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api"
import { getFavicon, useCachedPromise, useCachedState } from "@raycast/utils"
import type { ApiResult } from "highseat/api"
import { api } from "../lib/highseat"

export type Site = ApiResult<"/sites">["data"][number]
export type SiteOverview = ApiResult<"/sites/overview">["data"][number]

export function getSiteIcon(site: Site) {
  return getFavicon(`https://${site.domain}`, { fallback: Icon.Globe })
}

export function useSites() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => api.get("/sites"))
  return { sites: data?.data ?? [], isLoading, error, revalidate }
}

/** The site last picked, or the first one when that site is gone or none was picked. */
export function findSelectedSite<T extends Site>(sites: T[], siteId: string | undefined) {
  return sites.find(site => site.id === siteId) ?? sites[0]
}

/** The sites of the connection and the one last picked, which every site command shares. */
export function useSelectedSite() {
  const { sites, ...state } = useSites()
  const [siteId, setSiteId] = useCachedState<string | undefined>("site-id", undefined)

  return {
    sites,
    site: findSelectedSite(sites, siteId),
    setSiteId,
    ...state,
  }
}

interface SwitchSiteActionProps {
  sites: Site[]
  onSelect: (siteId: string) => void
}

export function SwitchSiteAction({ sites, onSelect }: SwitchSiteActionProps) {
  return (
    <ActionPanel.Submenu title="Switch Site" icon={Icon.Switch} shortcut={Keyboard.Shortcut.Common.Save}>
      {sites.map(site => (
        <Action key={site.id} icon={getSiteIcon(site)} title={site.name} onAction={() => onSelect(site.id)} />
      ))}
    </ActionPanel.Submenu>
  )
}
