import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { listInstalledTools, formatMiseError, MiseInstalledTool } from "./tools/mise";
import { useState, useMemo } from "react";
import { ToolSection } from "./components/ToolSection";

type FilterType = "all" | "active" | "global" | "local" | "multiple" | "unused";

export default function ShowInstalledCommand() {
  const { data, isLoading, error, revalidate } = usePromise(listInstalledTools, []);
  const [filter, setFilter] = useState<FilterType>("all");
  const tools = data ?? [];

  const filteredTools = useMemo(() => {
    return tools
      .map((tool) => {
        // Apply tool-level filters first if needed, but mostly we filter versions or tools based on version properties
        let filteredVersions = tool.versions;

        if (filter === "active") {
          filteredVersions = tool.versions.filter((v) => v.isActive);
        } else if (filter === "global") {
          filteredVersions = tool.versions.filter(
            (v) => v.sourcePath?.includes("config.toml") || v.sourcePath?.includes("mise/config.toml"),
          );
        } else if (filter === "local") {
          filteredVersions = tool.versions.filter(
            (v) => v.sourcePath && !v.sourcePath.includes("config.toml") && !v.sourcePath.includes("mise/config.toml"),
          );
        } else if (filter === "unused") {
          filteredVersions = tool.versions.filter((v) => !v.isActive && !v.requestedVersion);
        }

        // Special case for "multiple": filter TOOLS that have > 1 version
        if (filter === "multiple") {
          if (tool.versions.length <= 1) return null;
          return tool;
        }

        if (filteredVersions.length === 0) return null;

        return { ...tool, versions: filteredVersions };
      })
      .filter(Boolean) as MiseInstalledTool[];
  }, [tools, filter]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter by tool or version"
      isShowingDetail={filteredTools.length > 0}
      filtering
      throttle
      searchBarAccessory={
        <List.Dropdown tooltip="Filter Tools" value={filter} onChange={(newValue) => setFilter(newValue as FilterType)}>
          <List.Dropdown.Item title="All Tools" value="all" icon={Icon.List} />
          <List.Dropdown.Item title="Active Only" value="active" icon={Icon.CheckCircle} />
          <List.Dropdown.Item title="Global Tools" value="global" icon={Icon.Globe} />
          <List.Dropdown.Item title="Local Tools" value="local" icon={Icon.Folder} />
          <List.Dropdown.Item title="Multiple Versions" value="multiple" icon={Icon.Layers} />
          <List.Dropdown.Item title="Unused / Inactive" value="unused" icon={Icon.Circle} />
        </List.Dropdown>
      }
    >
      {error ? (
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Failed to load installed tools"
          description={formatMiseError(error)}
          actions={
            <ActionPanel>
              <Action title="Retry" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {!error && tools.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No tools installed via mise"
          description="Install a tool with `mise install <tool>@<version>` or from the Search command."
          actions={
            <ActionPanel>
              <Action title="Refresh" onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      ) : null}
      {filteredTools.map((tool) => (
        <ToolSection key={tool.name} tool={tool} onRefresh={revalidate} />
      ))}
    </List>
  );
}
