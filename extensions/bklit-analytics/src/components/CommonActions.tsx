import { ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

interface CommonActionsProps {
  dashboardUrl: string;
  projectId: string;
  onRefresh: () => void;
}

export function CommonActions({ dashboardUrl, projectId, onRefresh }: CommonActionsProps) {
  return (
    <ActionPanel>
      <Action.OpenInBrowser title="Open Dashboard" url={`${dashboardUrl}/projects/${projectId}`} />
      <Action
        title="Refresh All Data"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={onRefresh}
      />
      <Action title="Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}
