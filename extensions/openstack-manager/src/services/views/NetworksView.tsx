import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { NetworkService } from "../NetworkService";
import { Network } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { filterByName } from "../../utils/searchFilter";
import { buildHorizonLink } from "../../utils/horizonUrl";
import NetworkDetailView from "./NetworkDetailView";

interface NetworksViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function NetworksView({ configName, horizonUrl, binaryPath, cache, configManager }: NetworksViewProps) {
  const [searchText, setSearchText] = useState("");

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const networkService = useMemo(() => new NetworkService(cli, cache, configManager), [cli, cache, configManager]);

  const fetchNetworks = useCallback(() => networkService.listNetworks(), [networkService]);
  const {
    data: networks,
    isLoading,
    revalidate,
  } = useFetchWithCache<Network[]>(`networks:${configName}`, fetchNetworks);

  const filtered = filterByName(networks ?? [], searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search networks by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Networks — ${configName}`}
    >
      {!isLoading && (networks ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.Network}
          title="No Networks Found"
          description="No networks available in this project."
        />
      )}
      {filtered.map((network) => {
        const horizonLink = buildHorizonLink(horizonUrl, "networks", network.id);
        return (
          <List.Item
            key={network.id}
            icon={Icon.Network}
            title={network.name}
            subtitle={network.provider_network_type ?? ""}
            accessories={[
              { text: network.status ?? "" },
              { text: network.admin_state_up != null ? (network.admin_state_up ? "UP" : "DOWN") : "" },
              { text: network.shared != null ? (network.shared ? "Shared" : "Private") : "" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <NetworkDetailView
                      networkId={network.id}
                      networkName={network.name}
                      horizonUrl={horizonUrl}
                      binaryPath={binaryPath}
                      configName={configName}
                    />
                  }
                />
                <Action
                  title="Copy Id"
                  icon={Icon.Clipboard}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() => {
                    Clipboard.copy(network.id);
                    showToast({ style: Toast.Style.Success, title: "Copied ID", message: network.id });
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
