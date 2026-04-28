import { Action, ActionPanel, Clipboard, Icon, List, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { FlavorService } from "../FlavorService";
import { Flavor } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { filterByName } from "../../utils/searchFilter";
import FlavorDetailView from "./FlavorDetailView";

interface FlavorsViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function FlavorsView({ configName, horizonUrl, binaryPath, cache, configManager }: FlavorsViewProps) {
  const [searchText, setSearchText] = useState("");

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const flavorService = useMemo(() => new FlavorService(cli, cache, configManager), [cli, cache, configManager]);

  const fetchFlavors = useCallback(() => flavorService.listFlavors(), [flavorService]);
  const { data: flavors, isLoading, revalidate } = useFetchWithCache<Flavor[]>(`flavors:${configName}`, fetchFlavors);

  const filtered = filterByName(flavors ?? [], searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search flavors by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Flavors — ${configName}`}
    >
      {!isLoading && (flavors ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.MemoryChip}
          title="No Flavors Found"
          description="No flavors available in this project."
        />
      )}
      {filtered.map((flavor) => (
        <List.Item
          key={flavor.id}
          icon={Icon.MemoryChip}
          title={flavor.name ?? flavor.id}
          subtitle={`${flavor.vcpus ?? 0} vCPUs`}
          accessories={[{ text: `${flavor.ram ?? 0} MB RAM` }, { text: `${flavor.disk ?? 0} GB disk` }]}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Details"
                icon={Icon.Eye}
                target={
                  <FlavorDetailView
                    flavorId={flavor.id}
                    flavorName={flavor.name ?? flavor.id}
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
                  Clipboard.copy(flavor.id);
                  showToast({ style: Toast.Style.Success, title: "Copied ID", message: flavor.id });
                }}
              />
              <Action
                title="Refresh"
                icon={Icon.ArrowClockwise}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
                onAction={revalidate}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
