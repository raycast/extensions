import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { ServerService } from "../ServerService";
import { Server } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { getServerStatusColor } from "../../utils/statusColors";
import { filterByName } from "../../utils/searchFilter";
import { buildHorizonLink } from "../../utils/horizonUrl";
import ServerDetailView from "./ServerDetailView";

interface ServersViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function ServersView({ configName, horizonUrl, binaryPath, cache, configManager }: ServersViewProps) {
  const [searchText, setSearchText] = useState("");

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const serverService = useMemo(() => new ServerService(cli, cache, configManager), [cli, cache, configManager]);

  const fetchServers = useCallback(() => serverService.listServers(), [serverService]);
  const { data: servers, isLoading, revalidate } = useFetchWithCache<Server[]>(`servers:${configName}`, fetchServers);

  const filtered = filterByName(servers ?? [], searchText);

  const handleStart = useCallback(
    async (server: Server) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: `Starting ${server.name}...` });
        await serverService.startServer(server.id);
        await showToast({ style: Toast.Style.Success, title: `Started ${server.name}` });
        await revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to start ${server.name}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [serverService, revalidate],
  );

  const handleStop = useCallback(
    async (server: Server) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: `Stopping ${server.name}...` });
        await serverService.stopServer(server.id);
        await showToast({ style: Toast.Style.Success, title: `Stopped ${server.name}` });
        await revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to stop ${server.name}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [serverService, revalidate],
  );

  const handleReboot = useCallback(
    async (server: Server) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: `Rebooting ${server.name}...` });
        await serverService.rebootServer(server.id);
        await showToast({ style: Toast.Style.Success, title: `Rebooted ${server.name}` });
        await revalidate();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: `Failed to reboot ${server.name}`,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [serverService, revalidate],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search servers by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Servers — ${configName}`}
    >
      {!isLoading && (servers ?? []).length === 0 && (
        <List.EmptyView icon={Icon.Desktop} title="No Servers Found" description="No servers in this project." />
      )}
      {filtered.map((server) => {
        const horizonLink = buildHorizonLink(horizonUrl, "servers", server.id);
        return (
          <List.Item
            key={server.id}
            icon={Icon.Desktop}
            title={server.name}
            subtitle={server.flavor ?? ""}
            accessories={[
              { tag: { value: server.status ?? "UNKNOWN", color: getServerStatusColor(server.status ?? "") } },
              { text: server.networks ?? "" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <ServerDetailView
                      serverId={server.id}
                      serverName={server.name}
                      horizonUrl={horizonUrl}
                      binaryPath={binaryPath}
                      configName={configName}
                    />
                  }
                />
                {(server.status ?? "") === "SHUTOFF" && (
                  <Action
                    title="Start"
                    icon={{ source: Icon.Play, tintColor: "#00ff00" }}
                    onAction={() => handleStart(server)}
                  />
                )}
                {(server.status ?? "") === "ACTIVE" && (
                  <Action
                    title="Stop"
                    icon={{ source: Icon.Stop, tintColor: "#ff0000" }}
                    onAction={() => handleStop(server)}
                  />
                )}
                <Action title="Reboot" icon={Icon.RotateAntiClockwise} onAction={() => handleReboot(server)} />
                <Action
                  title="Copy Id"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => {
                    Clipboard.copy(server.id);
                    showToast({ style: Toast.Style.Success, title: "Copied ID", message: server.id });
                  }}
                />
                {horizonLink && (
                  <Action
                    title="Open in Browser"
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ["cmd"], key: "o" }}
                    onAction={() => open(horizonLink)}
                  />
                )}
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={revalidate}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
