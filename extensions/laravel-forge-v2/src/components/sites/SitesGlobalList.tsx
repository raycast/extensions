import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import { IServer, ISite } from "../../types";
import { useServers } from "../../hooks/useServers";
import { useGlobalSites } from "../../hooks/useGlobalSites";
import { EmptyView } from "../EmptyView";
import { SiteSingle } from "./SiteSingle";
import { SiteCommands } from "../actions/SiteCommands";
import { ServerCommands } from "../actions/ServerCommands";
import { getDeplymentStateIcon } from "../../lib/color";
import { findBestSiteMatch } from "../../lib/site-match";
import { ALL_ORGS, resolveInitialOrg, setStoredDefaultOrg } from "../../lib/org";

export const SitesGlobalList = ({ search }: { search: string }) => {
  const { servers, loading: serversLoading, error: serversError } = useServers();
  const { sites, loading: sitesLoading, error: sitesError } = useGlobalSites();
  const [selectedOrg, setSelectedOrg] = useState<string>(ALL_ORGS);
  const [incomingSearch, setIncomingSearch] = useState(search);
  const { push } = useNavigation();

  const loading = serversLoading || sitesLoading;
  const error = serversError || sitesError;

  useEffect(() => {
    resolveInitialOrg().then(setSelectedOrg);
  }, []);

  // Index servers by id so each site can resolve its parent server object.
  const serversById = useMemo(() => {
    const map = new Map<string, IServer>();
    servers?.forEach((s) => map.set(s.id.toString(), s));
    return map;
  }, [servers]);

  // Only sites whose server resolves can open the full info screen; drop orphans
  // (e.g. sites on revoked servers, which useServers already filters out).
  const resolvableSites = useMemo(
    () => (sites ?? []).filter((site) => site.server_id && serversById.has(site.server_id.toString())),
    [sites, serversById]
  );

  const orgs = useMemo(() => {
    const set = new Set<string>();
    resolvableSites.forEach((s) => s.org_slug && set.add(s.org_slug));
    return [...set].sort();
  }, [resolvableSites]);

  // If the resolved default org isn't present, fall back to All.
  useEffect(() => {
    if (selectedOrg !== ALL_ORGS && orgs.length > 0 && !orgs.includes(selectedOrg)) {
      setSelectedOrg(ALL_ORGS);
    }
  }, [orgs, selectedOrg]);

  const visibleSites = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return resolvableSites;
    return resolvableSites.filter((s) => s.org_slug === selectedOrg);
  }, [resolvableSites, selectedOrg]);

  // Launch argument: jump straight to the best-matching site once data is loaded.
  useEffect(() => {
    if (!incomingSearch || loading) return;
    const site = findBestSiteMatch(resolvableSites, incomingSearch);
    if (!site) return;
    const server = serversById.get(site.server_id.toString());
    if (!server) return;
    showToast(Toast.Style.Success, `Now showing: ${site.name ?? `#${site.id}`}`);
    push(<SiteSingle site={site} server={server} />);
    setIncomingSearch("");
  }, [incomingSearch, loading, resolvableSites, serversById]);

  const saveDefaultOrg = async () => {
    await setStoredDefaultOrg(selectedOrg);
    await showToast(
      Toast.Style.Success,
      selectedOrg === ALL_ORGS ? "Default set to: All organizations" : `Default organization: ${selectedOrg}`
    );
  };

  if (error) {
    const message = typeof error === "string" ? error : error.message;
    return <EmptyView title={`Error: ${message}`} />;
  }
  if (!loading && visibleSites.length === 0) {
    return <EmptyView title="No sites found" />;
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search sites..."
      searchBarAccessory={
        <List.Dropdown tooltip="Organization" value={selectedOrg} onChange={setSelectedOrg}>
          <List.Dropdown.Item title="All organizations" value={ALL_ORGS} />
          {orgs.map((org) => (
            <List.Dropdown.Item key={org} title={org} value={org} />
          ))}
        </List.Dropdown>
      }
    >
      {visibleSites.map((site) => {
        const server = serversById.get(site.server_id.toString());
        if (!server) return null;
        return <SiteGlobalListItem key={site.id} site={site} server={server} onSetDefaultOrg={saveDefaultOrg} />;
      })}
    </List>
  );
};

export const SiteGlobalListItem = ({
  site,
  server,
  onSetDefaultOrg,
}: {
  site: ISite;
  server: IServer;
  onSetDefaultOrg: () => void;
}) => {
  if (!site?.id) return null;
  // Status from already-loaded API data only — no live online HTTP check here.
  const state = getDeplymentStateIcon(site.deployment_status || "connected");
  return (
    <List.Item
      id={site.id.toString()}
      key={site.id}
      keywords={site.aliases}
      title={site.name ?? "Site name undefined"}
      subtitle={site.repository ?? ""}
      icon={state.icon}
      accessories={[{ text: site.org_slug ?? "" }, { text: state.text }]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Site Info"
              icon={Icon.Binoculars}
              target={<SiteSingle site={site} server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Site Commands">
            <SiteCommands site={site} server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Server Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Organization">
            <Action icon={Icon.Star} title="Set Selected Org as Default" onAction={onSetDefaultOrg} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
