import { Action, Icon } from "@raycast/api";

export function HiddenFilesAction({ onToggle }: { onToggle: () => void }) {
  return (
    <Action
      title="Toggle Hidden Files"
      icon={Icon.Eye}
      shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
      onAction={onToggle}
    />
  );
}
