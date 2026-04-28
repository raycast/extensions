import { Action, ActionPanel, Clipboard, Icon, List, open, showToast, Toast } from "@raycast/api";
import { useCallback, useMemo, useState } from "react";
import { CLIExecutor } from "../../core/CLIExecutor";
import { ResourceCache } from "../../core/ResourceCache";
import { useFetchWithCache } from "../../core/useFetchWithCache";
import { SecurityGroupService } from "../SecurityGroupService";
import { SecurityGroup } from "../types";
import { ConfigManager } from "../../config/ConfigManager";
import { filterByName } from "../../utils/searchFilter";
import { buildHorizonLink } from "../../utils/horizonUrl";
import SecurityGroupDetailView from "./SecurityGroupDetailView";

interface SecurityGroupsViewProps {
  configName: string;
  horizonUrl?: string;
  binaryPath: string;
  cache: ResourceCache;
  configManager: ConfigManager;
}

export default function SecurityGroupsView({
  configName,
  horizonUrl,
  binaryPath,
  cache,
  configManager,
}: SecurityGroupsViewProps) {
  const [searchText, setSearchText] = useState("");

  const cli = useMemo(() => new CLIExecutor(binaryPath, configName), [binaryPath, configName]);
  const securityGroupService = useMemo(
    () => new SecurityGroupService(cli, cache, configManager),
    [cli, cache, configManager],
  );

  const fetchGroups = useCallback(() => securityGroupService.listSecurityGroups(), [securityGroupService]);
  const {
    data: groups,
    isLoading,
    revalidate,
  } = useFetchWithCache<SecurityGroup[]>(`security-groups:${configName}`, fetchGroups);

  const filtered = filterByName(groups ?? [], searchText);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search security groups by name..."
      onSearchTextChange={setSearchText}
      navigationTitle={`Security Groups — ${configName}`}
    >
      {!isLoading && (groups ?? []).length === 0 && (
        <List.EmptyView
          icon={Icon.Shield}
          title="No Security Groups Found"
          description="No security groups in this project."
        />
      )}
      {filtered.map((group) => {
        const horizonLink = buildHorizonLink(horizonUrl, "security_groups", group.id);
        return (
          <List.Item
            key={group.id}
            icon={Icon.Shield}
            title={group.name}
            subtitle={group.description ?? ""}
            accessories={[{ text: group.description ?? "" }]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  icon={Icon.Eye}
                  target={
                    <SecurityGroupDetailView
                      securityGroupId={group.id}
                      securityGroupName={group.name}
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
                    Clipboard.copy(group.id);
                    showToast({ style: Toast.Style.Success, title: "Copied ID", message: group.id });
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
