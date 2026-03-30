import { List, Icon } from "@raycast/api";
import { useState } from "react";
import { usePlugins } from "./hooks/usePlugins";
import { PluginsView } from "./components/PluginsView";
import { SkillsView } from "./components/SkillsView";
import { McpView } from "./components/McpView";

type ViewMode = "plugins" | "skills" | "mcp";

const SEARCH_PLACEHOLDERS: Record<ViewMode, string> = {
  plugins: "Search plugins...",
  skills: "Search skills...",
  mcp: "Search MCP servers...",
};

export default function PluginManagerCommand() {
  const [viewMode, setViewMode] = useState<ViewMode>("plugins");
  const {
    enabledPlugins,
    disabledPlugins,
    skills,
    mcpServers,
    isLoading,
    isMcpLoading,
    revalidateLocal,
    revalidateMcp,
  } = usePlugins();

  return (
    <List
      isLoading={viewMode === "mcp" ? isMcpLoading : isLoading}
      searchBarPlaceholder={SEARCH_PLACEHOLDERS[viewMode]}
      searchBarAccessory={
        <List.Dropdown
          tooltip="View"
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
        >
          <List.Dropdown.Item
            title="Plugins"
            value="plugins"
            icon={Icon.Plug}
          />
          <List.Dropdown.Item title="Skills" value="skills" icon={Icon.Book} />
          <List.Dropdown.Item
            title="MCP Servers"
            value="mcp"
            icon={Icon.Globe}
          />
        </List.Dropdown>
      }
    >
      {viewMode === "plugins" && (
        <PluginsView
          enabledPlugins={enabledPlugins}
          disabledPlugins={disabledPlugins}
          isLoading={isLoading}
          revalidate={revalidateLocal}
        />
      )}
      {viewMode === "skills" && (
        <SkillsView
          skills={skills}
          isLoading={isLoading}
          revalidate={revalidateLocal}
        />
      )}
      {viewMode === "mcp" && (
        <McpView
          servers={mcpServers}
          isLoading={isMcpLoading}
          revalidate={revalidateMcp}
        />
      )}
    </List>
  );
}
