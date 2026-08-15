import { Action, ActionPanel, Icon, List, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { basename } from "node:path";

export default function Command() {
  const preferences = getPreferenceValues<{ workspaceRoot?: string }>();
  const workspaceRoot = preferences.workspaceRoot;

  if (workspaceRoot) {
    const projectName = basename(workspaceRoot);
    return (
      <List searchBarPlaceholder="Workspace Connected">
        <List.EmptyView
          title={`Workspace Connected: ${projectName}`}
          description="Start vibe coding with @ray-code AI Extension"
          icon={{
            source: Icon.Stars,
            tintColor: "#D57355",
          }}
          actions={
            <ActionPanel>
              <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder="Setup Workspace Directory">
      <List.EmptyView
        title="Setup Workspace Directory"
        description="Please configure your workspace root directory to use Ray Code features."
        icon={{
          source: Icon.Folder,
          tintColor: "#FF9500",
        }}
        actions={
          <ActionPanel>
            <Action icon={Icon.Gear} title="Open Extension Preferences" onAction={openExtensionPreferences} />
            <Action.OpenInBrowser
              icon={Icon.QuestionMark}
              title="View Setup Guide"
              url="https://manual.raycast.com/extensions"
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
