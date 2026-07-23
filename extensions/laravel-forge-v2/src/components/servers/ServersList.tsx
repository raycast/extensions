import { Action, ActionPanel, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { useServers } from "../../hooks/useServers";
import { IServer } from "../../types";
import { EmptyView } from "../../components/EmptyView";
import { ServerSingle } from "./ServerSingle";
import { ServerCommands } from "../actions/ServerCommands";
import { getServerColor } from "../../lib/color";
import { useSites } from "../../hooks/useSites";
import { useEffect, useMemo, useState } from "react";
import { ALL_ORGS, resolveInitialOrg, setStoredDefaultOrg } from "../../lib/org";

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

  useEffect(() => {
    resolveInitialOrg().then(setSelectedOrg);
  }, []);

  // Unique org slugs present in the fetched servers, for the dropdown.
  const orgs = useMemo(() => {
    const set = new Set<string>();
    servers?.forEach((s) => s.org_slug && set.add(s.org_slug));
    return [...set].sort();
  }, [servers]);

  // If the resolved default org isn't among the fetched servers' orgs, fall back to All.
  useEffect(() => {
    if (selectedOrg !== ALL_ORGS && orgs.length > 0 && !orgs.includes(selectedOrg)) {
      setSelectedOrg(ALL_ORGS);
    }
  }, [orgs, selectedOrg]);

  const visibleServers = useMemo(() => {
    if (selectedOrg === ALL_ORGS) return servers ?? [];
    return (servers ?? []).filter((s) => s.org_slug === selectedOrg);
  }, [servers, selectedOrg]);

  useEffect(() => {
    if (!incomingSearch) return;
    const server =
      // First match by ID, then if not do a full search
      servers?.find((server) => server.id.toString() === incomingSearch) ||
      servers?.find((server) => JSON.stringify(server).includes(incomingSearch));
    if (!server) return;
    showToast(Toast.Style.Success, `Now showing: ${server?.name}` ?? `Now showing: #${server?.id}`);
    push(<ServerSingle server={server} />);
    setIncomingSearch("");
  }, [incomingSearch]);

  const preFetchSites = (serverId: string | null) => {
    const server = servers?.find((server) => server.id.toString() === serverId);
    setPreLoadedServer(server);
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
  if (servers?.length === 0 && !loading) {
    return <EmptyView title="No servers found" />;
  }

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder="Search servers..."
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
      {visibleServers.map((server: IServer) => {
        return (
          <ServerListItem
            key={server.id}
            server={server}
            orgs={orgs}
            selectedOrg={selectedOrg}
            onSelectOrg={selectOrg}
            onSetDefaultOrg={saveDefaultOrg}
          />
        );
      })}
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
