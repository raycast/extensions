import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { useWezTermTabs } from "./hooks/useWezTerm";
import { TabListItem } from "./components/TabListItem";
import { WorkspaceDropdown } from "./components/WorkspaceDropdown";
import { WezTermNotFound } from "./components/WezTermNotFound";

export default function NavigateTabs() {
  const [selectedWorkspace, setSelectedWorkspace] = useState("all");
  const { workspaces, isLoading, error, revalidate, isWezTermInstalled } = useWezTermTabs();

  if (!isLoading && !isWezTermInstalled) {
    return (
      <List>
        <WezTermNotFound />
      </List>
    );
  }

  const filteredWorkspaces =
    selectedWorkspace === "all" ? workspaces : workspaces.filter((ws) => ws.name === selectedWorkspace);

  const hasTabs = workspaces.some((ws) => ws.tabs.length > 0);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={hasTabs}
      searchBarPlaceholder="Search tabs by name, workspace, or directory..."
      searchBarAccessory={
        workspaces.length > 1 ? (
          <WorkspaceDropdown workspaces={workspaces} onWorkspaceChange={setSelectedWorkspace} />
        ) : undefined
      }
    >
      {error && !isLoading && (
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to Load Tabs" description={error} />
      )}
      {!error && !isLoading && !hasTabs && (
        <List.EmptyView
          icon={Icon.Terminal}
          title="No WezTerm Tabs Found"
          description="Open WezTerm to get started. Your tabs will appear here."
        />
      )}
      {filteredWorkspaces.map((workspace) => (
        <List.Section
          key={workspace.name}
          title={workspace.name}
          subtitle={`${workspace.tabCount} tab${workspace.tabCount !== 1 ? "s" : ""}`}
        >
          {workspace.tabs.map((tab) => (
            <TabListItem key={tab.tabId} tab={tab} onTabChanged={revalidate} />
          ))}
        </List.Section>
      ))}
    </List>
  );
}
