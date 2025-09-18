import { ActionPanel, Action, Icon } from "@raycast/api";

interface CommonActionPanelProps {
  onRefresh: () => Promise<void>;
  onClearCache: () => void;
  children?: React.ReactNode;
}

export function CommonActionPanel({ onRefresh, onClearCache, children }: CommonActionPanelProps) {
  return (
    <ActionPanel>
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        onAction={onRefresh}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
      />
      <Action
        title="Clear Cache"
        icon={Icon.Trash}
        onAction={onClearCache}
        shortcut={{ modifiers: ["cmd"], key: "shift", key: "c" }}
      />
      {children}
    </ActionPanel>
  );
}
