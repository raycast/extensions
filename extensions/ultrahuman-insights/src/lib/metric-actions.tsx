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
        shortcut={{ macOS: { modifiers: ["cmd"], key: "r" }, Windows: { modifiers: ["ctrl"], key: "r" } }}
        onAction={refresh}
      />
      <Action
        title="Open Preferences"
        icon={Icon.Cog}
        shortcut={{ macOS: { modifiers: ["cmd"], key: "," }, Windows: { modifiers: ["ctrl"], key: "," } }}
        onAction={openExtensionPreferences}
      />
      {copyContent != null && copyTitle != null && (
        <Action.CopyToClipboard
          title={copyTitle}
          content={copyContent}
          shortcut={{ macOS: { modifiers: ["cmd"], key: "c" }, Windows: { modifiers: ["ctrl"], key: "c" } }}
        />
      )}
    </ActionPanel>
  );
}
