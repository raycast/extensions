import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useServers } from "../../hooks/useServers";
import { useGlobalSites } from "../../hooks/useGlobalSites";
import { IServer } from "../../types";
import { EmptyView } from "../../components/EmptyView";
import { ServerSingle } from "./ServerSingle";
import { ServerCommands } from "../actions/ServerCommands";
import { getServerColor } from "../../lib/color";
import { useSites } from "../../hooks/useSites";
import { useEffect, useMemo, useState } from "react";
import { ALL_ORGS, resolveInitialOrg, setStoredDefaultOrg } from "../../lib/org";
import { keywordsByServer } from "../../lib/site-match";
import { SiteGlobalListItem } from "../sites/SitesGlobalList";

export const ServersList = ({ search }: { search: string }) => {
  const [preLoadedServer, setPreLoadedServer] = useState<IServer>();
  const { servers, loading, error } = useServers();
  const [incomingSearch, setIncomingSearch] = useState(search);
  const [selectedOrg, setSelectedOrg] = useState<string>(ALL_ORGS);
  useSites(preLoadedServer, {
    // Immutable
    revalidateIfStale: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });
  const { push } = useNavigation();
  const { sites, loading: sitesLoading } = useGlobalSites();

  // Index servers by id so each site can resolve its parent server object.
  const serversById = useMemo(() => {
    const map = new Map<string, IServer>();
    servers?.forEach((s) => map.set(s.id.toString(), s));
    return map;
  }, [servers]);

  // Fold every server's site domains into its search keywords, derived client-side
  // from the sites we already fetch — so typing a domain still surfaces its server,
  // with no extra per-org request.
  const serversWithKeywords = useMemo(() => {
    const keywords = keywordsByServer(sites ?? []);
    return (servers ?? []).map((s) => ({ ...s, keywords: keywords[s.id.toString()] ?? [] }));
  }, [servers, sites]);

  // Sites whose parent server resolves — shown in the Sites section and openable.
  const resolvableSites = useMemo(
    () => (sites ?? []).filter((site) => site.server_id && serversById.has(site.server_id.toString())),
    [sites, serversById]
  );

  useEffect(() => {
    resolveInitialOrg().then(setSelectedOrg);
  }, []);

  // Unique org slugs present in the fetched servers, for the dropdown.
  const orgs = useMemo(() => {
    const set = new Set<string>();
    serversWithKeywords.forEach((s) => s.org_slug && set.add(s.org_slug));
    return [...set].sort();
  }, [serversWithKeywords]);

  // If the resolved default org isn't among the fetched servers' orgs, fall back to All.
  useEffect(() => {
    if (selectedOrg !== ALL_ORGS && orgs.length > 0 && !orgs.includes(selectedOrg)) {
      setSelectedOrg(ALL_ORGS);
    }
  }, [orgs, selectedOrg]);

  const visibleServers = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return serversWithKeywords;
    return serversWithKeywords.filter((s) => s.org_slug === selectedOrg);
  }, [serversWithKeywords, selectedOrg]);

  const visibleSites = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return resolvableSites;
    return resolvableSites.filter((s) => s.org_slug === selectedOrg);
  }, [resolvableSites, selectedOrg]);

  useEffect(() => {
    if (!incomingSearch) return;
    const server =
      // First match by ID, then if not do a full search (keywords include site domains)
      serversWithKeywords.find((server) => server.id.toString() === incomingSearch) ||
      serversWithKeywords.find((server) => JSON.stringify(server).includes(incomingSearch));
    if (!server) return;
    showToast(Toast.Style.Success, `Now showing: ${server?.name}` ?? `Now showing: #${server?.id}`);
    push(<ServerSingle server={server} />);
    setIncomingSearch("");
  }, [incomingSearch, serversWithKeywords]);

  const preFetchSites = (serverId: string | null) => {
    setPreLoadedServer(serverId ? serversById.get(serverId) : undefined);
  };

  const saveDefaultOrg = async () => {
    await setStoredDefaultOrg(selectedOrg);
    await showToast(
      Toast.Style.Success,
      selectedOrg === ALL_ORGS ? "Default set to: All organizations" : `Default organization: ${selectedOrg}`
    );
  };

  const selectOrg = (org: string) => {
    setSelectedOrg(org);
    showToast(Toast.Style.Success, org === ALL_ORGS ? "Organization: All organizations" : `Organization: ${org}`);
  };

  if (error?.message) {
    return <EmptyView title={`Error: ${error.message}`} />;
  }
  if (!loading && !sitesLoading && visibleServers.length === 0 && visibleSites.length === 0) {
    return <EmptyView title="Nothing found" />;
  }

  return (
    <List
      isLoading={loading || sitesLoading}
      searchBarPlaceholder="Search servers and sites..."
      onSelectionChange={preFetchSites}
      searchBarAccessory={
        <List.Dropdown tooltip="Organization" value={selectedOrg} onChange={setSelectedOrg}>
          <List.Dropdown.Item title="All organizations" value={ALL_ORGS} />
          {orgs.map((org) => (
            <List.Dropdown.Item key={org} title={org} value={org} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Servers">
        {visibleServers.map((server: IServer) => (
          <ServerListItem
            key={server.id}
            server={server}
            orgs={orgs}
            selectedOrg={selectedOrg}
            onSelectOrg={selectOrg}
            onSetDefaultOrg={saveDefaultOrg}
          />
        ))}
      </List.Section>
      <List.Section title="Sites">
        {visibleSites.map((site) => {
          const server = serversById.get(site.server_id.toString());
          if (!server) return null;
          return <SiteGlobalListItem key={site.id} site={site} server={server} onSetDefaultOrg={saveDefaultOrg} />;
        })}
      </List.Section>
    </List>
  );
};

const ServerListItem = ({
  server,
  orgs,
  selectedOrg,
  onSelectOrg,
  onSetDefaultOrg,
}: {
  server: IServer;
  orgs: string[];
  selectedOrg: string;
  onSelectOrg: (org: string) => void;
  onSetDefaultOrg: () => void;
}) => {
  if (!server?.id) return null;
  return (
    <List.Item
      id={server.id.toString()}
      key={server.id}
      keywords={server.keywords}
      accessories={[{ text: server?.keywords?.join(", ") ?? "" }]}
      title={server?.name ?? "Server name undefined"}
      icon={{
        source: Icon.Box,
        tintColor: getServerColor(server?.provider ?? ""),
      }}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Open Server Information"
              icon={Icon.Binoculars}
              target={<ServerSingle server={server} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Organization">
            <ActionPanel.Submenu
              title="Switch Organization"
              icon={Icon.Building}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            >
              <Action
                title="All Organizations"
                icon={selectedOrg === ALL_ORGS ? Icon.Check : Icon.Globe}
                onAction={() => onSelectOrg(ALL_ORGS)}
              />
              {orgs.map((org) => (
                <Action
                  key={org}
                  title={org}
                  icon={selectedOrg === org ? Icon.Check : Icon.Building}
                  onAction={() => onSelectOrg(org)}
                />
              ))}
            </ActionPanel.Submenu>
            <Action icon={Icon.Star} title="Set Selected Org as Default" onAction={onSetDefaultOrg} />
          </ActionPanel.Section>
          <ActionPanel.Section title="Commands">
            <ServerCommands server={server} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
};
