import { ActionPanel, Action, Icon, openExtensionPreferences } from "@raycast/api";

interface MetricActionsProps {
  refresh: () => Promise<void>;
  copyTitle?: string;
  copyContent?: string | null;
}

export function MetricActions({ refresh, copyTitle, copyContent }: MetricActionsProps) {
  return (
    <ActionPanel>
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={refresh}
      />
      <Action
        title="Open Preferences"
        icon={Icon.Cog}
        shortcut={{ modifiers: ["cmd"], key: "," }}
        onAction={openExtensionPreferences}
      />
      {copyContent != null && copyTitle != null && (
        <Action.CopyToClipboard title={copyTitle} content={copyContent} shortcut={{ modifiers: ["cmd"], key: "c" }} />
      )}
    </ActionPanel>
  );
}
