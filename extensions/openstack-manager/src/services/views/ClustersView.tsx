import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { ClusterService } from "../ClusterService";
import { MagnumCluster } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { getClusterStatusColor } from "../../utils/statusColors";
import { filterByName } from "../../utils/searchFilter";
import { buildHorizonLink } from "../../utils/horizonUrl";
import ClusterDetailView from "./ClusterDetailView";

interface ClustersViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function ClustersView({ configName, horizonUrl, binaryPath, cache, configManager }: ClustersViewProps) {
  const [searchText, setSearchText] = useState("");
  const [magnumUnavailable, setMagnumUnavailable] = useState(false);

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const clusterService = useMemo(() => new ClusterService(cli, cache, configManager), [cli, cache, configManager]);

  const fetchClusters = useCallback(async () => {
    setMagnumUnavailable(false);
    try {
      return await clusterService.listClusters();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.toLowerCase().includes("not available") || message.toLowerCase().includes("endpoint not found")) {
        setMagnumUnavailable(true);
      }
      throw error;
    }
  }, [clusterService]);

  const {
    data: clusters,
    isLoading,
    revalidate,
  } = useFetchWithCache<MagnumCluster[]>(`clusters:${configName}`, fetchClusters);

  const filtered = filterByName(clusters ?? [], searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search clusters by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Kubernetes Clusters — ${configName}`}
    >
      {magnumUnavailable ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Magnum Not Available"
          description="The Kubernetes (Magnum) service is not available in this region."
        />
      ) : !isLoading && (clusters ?? []).length === 0 ? (
        <List.EmptyView
          icon={Icon.ComputerChip}
          title="No Clusters Found"
          description="No Kubernetes clusters in this project."
        />
      ) : null}
      {filtered.map((cluster) => {
        const horizonLink = buildHorizonLink(horizonUrl, "clusters", cluster.uuid);
        return (
          <List.Item
            key={cluster.uuid}
            icon={Icon.ComputerChip}
            title={cluster.name}
            subtitle={cluster.coe_version ?? ""}
            accessories={[
              { tag: { value: cluster.status ?? "UNKNOWN", color: getClusterStatusColor(cluster.status ?? "") } },
              { text: `M:${cluster.master_count ?? 0} N:${cluster.node_count ?? 0}` },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <ClusterDetailView
                      clusterId={cluster.uuid}
                      clusterName={cluster.name}
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
                    Clipboard.copy(cluster.uuid);
                    showToast({ style: Toast.Style.Success, title: "Copied ID", message: cluster.uuid });
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
