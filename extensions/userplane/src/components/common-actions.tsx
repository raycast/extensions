import { Action, ActionPanel, Icon, openExtensionPreferences } from "@raycast/api";

import { dashHomeUrl, dashRecordingsUrl } from "../utils/dash-urls";

interface CommonActionsProps {
  workspaceId?: string;
  currentWorkspaceMemberId?: string;
}

export function CommonActions({ workspaceId, currentWorkspaceMemberId }: CommonActionsProps) {
  const myRecordingsUrl = dashRecordingsUrl({
    workspaceId,
    creators: currentWorkspaceMemberId ? [currentWorkspaceMemberId] : undefined,
  });
  return (
    <ActionPanel.Section title="Userplane">
      <Action.OpenInBrowser
        title="Open Userplane Dashboard"
        icon={Icon.Globe}
        url={dashHomeUrl()}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
      />
      <Action.OpenInBrowser
        title="View My Recordings"
        icon={Icon.Video}
        url={myRecordingsUrl}
        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
      />
      <Action
        title="Advanced Options"
        icon={Icon.Gear}
        shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
        onAction={() => {
          void openExtensionPreferences();
        }}
      />
    </ActionPanel.Section>
  );
}
