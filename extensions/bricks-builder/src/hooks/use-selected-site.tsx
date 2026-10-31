import { Action, ActionPanel, Icon, Keyboard } from "@raycast/api";
import { useCachedState, usePromise } from "@raycast/utils";
import { ManageSitesList } from "../components/manage-sites-list";
import { SiteForm } from "../components/site-form";
import { loadSites, Site } from "../lib/sites";

/** The site the user last picked, shared by every command. */
export function useSelectedSite() {
  // usePromise, not useCachedPromise: sites hold application passwords, and Raycast's cache is
  // stored unencrypted on disk. Reading them from LocalStorage is quick.
  const { data: sites, isLoading, revalidate } = usePromise(loadSites);
  const [siteId, setSiteId] = useCachedState<string | undefined>("selected-site");
  const site = sites?.find((s) => s.id === siteId) ?? sites?.[0];
  return { sites: sites ?? [], site, setSiteId, isLoading, reloadSites: revalidate };
}

export function AddSiteAction(props: { onSaved: (site: Site) => void }) {
  return (
    <Action.Push
      title="Add Site"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<SiteForm onSaved={props.onSaved} />}
    />
  );
}

/** "Switch Site" submenu, shown only when there's more than one site. */
export function SwitchSiteSubmenu(props: { sites: Site[]; current?: Site; onChange: (id: string) => void }) {
  if (props.sites.length < 2) return null;
  return (
    <ActionPanel.Submenu title="Switch Site…" icon={Icon.Globe} shortcut={Keyboard.Shortcut.Common.Duplicate}>
      {props.sites.map((site) => (
        <Action
          key={site.id}
          title={site.name}
          icon={site.id === props.current?.id ? Icon.CheckCircle : Icon.Circle}
          onAction={() => props.onChange(site.id)}
        />
      ))}
    </ActionPanel.Submenu>
  );
}

/** Opens Manage Bricks Sites; the site list reloads when you come back. */
export function ManageSitesAction(props: { onPop: () => void }) {
  return (
    <Action.Push
      title="Manage Sites"
      icon={Icon.Gear}
      shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
      target={<ManageSitesList />}
      onPop={props.onPop}
    />
  );
}
