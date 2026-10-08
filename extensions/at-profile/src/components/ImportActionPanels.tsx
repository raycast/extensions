import { Action, ActionPanel, Icon } from "@raycast/api";

interface ImportActionPanelsProps {
  state: "initial" | "success" | "error";
  onSelectFile: () => void;
  onImportAgain?: () => void;
  onOpenDocumentation: () => void;
  onTryAgain?: () => void;
}

export function ImportActionPanels({
  state,
  onSelectFile,
  onImportAgain,
  onOpenDocumentation,
  onTryAgain,
}: ImportActionPanelsProps) {
  switch (state) {
    case "success":
      return (
        <ActionPanel>
          <Action title="Import Again" icon={Icon.Document} onAction={onImportAgain || onSelectFile} />
          <Action title="Open Documentation" icon={Icon.Book} onAction={onOpenDocumentation} />
        </ActionPanel>
      );

    case "error":
      return (
        <ActionPanel>
          <Action title="Try Again" icon={Icon.Document} onAction={onTryAgain || onSelectFile} />
          <Action title="Open Documentation" icon={Icon.Book} onAction={onOpenDocumentation} />
        </ActionPanel>
      );

    case "initial":
    default:
      return (
        <ActionPanel>
          <Action title="Select File" icon={Icon.Document} onAction={onSelectFile} />
        </ActionPanel>
      );
  }
}
