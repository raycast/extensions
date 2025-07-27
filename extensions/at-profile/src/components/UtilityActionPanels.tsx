import { Action, ActionPanel, Icon, Clipboard, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface UtilityActionPanelsProps {
  type: "export-management" | "import-management";
  onExportApps?: () => void;
  onImportApps?: () => void;
  onGenerateSampleYAMLFile?: () => string;
}

export function UtilityActionPanels({
  type,
  onExportApps,
  onImportApps,
  onGenerateSampleYAMLFile,
}: UtilityActionPanelsProps) {
  const handleGenerateSampleYAML = async () => {
    if (onGenerateSampleYAMLFile) {
      try {
        const filePath = onGenerateSampleYAMLFile();
        await Clipboard.copy(filePath);
        await showToast({
          style: Toast.Style.Success,
          title: "Sample YAML Generated",
          message: "File path copied to clipboard",
        });
      } catch (error) {
        await showFailureToast(error instanceof Error ? error.message : "Unknown error", {
          title: "Generation Failed",
        });
      }
    }
  };

  if (type === "export-management") {
    return (
      <ActionPanel>
        <Action title="Export Apps" icon={Icon.Download} onAction={onExportApps} />
        <Action title="Generate Sample Yaml" icon={Icon.Document} onAction={handleGenerateSampleYAML} />
      </ActionPanel>
    );
  }

  if (type === "import-management") {
    return (
      <ActionPanel>
        <Action title="Import Apps" icon={Icon.Upload} onAction={onImportApps} />
      </ActionPanel>
    );
  }

  return <ActionPanel />;
}
