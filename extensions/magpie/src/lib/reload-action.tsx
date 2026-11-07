import { Action, ActionPanel, Icon } from "@raycast/api";

export function ReloadAction({ onReload }: { onReload: () => void }) {
  return (
    <ActionPanel>
      <Action title="Reload" icon={Icon.ArrowClockwise} onAction={onReload} />
    </ActionPanel>
  );
}
