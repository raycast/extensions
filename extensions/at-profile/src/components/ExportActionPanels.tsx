import { Action, ActionPanel, Icon } from "@raycast/api";

interface ExportActionPanelsProps {
  state: "initial" | "success" | "error";
  onExport: () => void;
  onShowInFinder?: () => void;
  onTryAgain?: () => void;
}

export function ExportActionPanels({ state, onExport, onShowInFinder, onTryAgain }: ExportActionPanelsProps) {
  switch (state) {
    case "success":
      return (
        <ActionPanel>
          <Action
            title="Show in Finder"
            icon={Icon.Finder}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
            onAction={onShowInFinder}
          />
          <Action title="Export Again" icon={Icon.Download} onAction={onExport} />
        </ActionPanel>
      );

    case "error":
      return (
        <ActionPanel>
          <Action title="Try Again" icon={Icon.Download} onAction={onTryAgain || onExport} />
        </ActionPanel>
      );

    case "initial":
    default:
      return (
        <ActionPanel>
          <Action title="Export" icon={Icon.Download} onAction={onExport} />
        </ActionPanel>
      );
  }
}
