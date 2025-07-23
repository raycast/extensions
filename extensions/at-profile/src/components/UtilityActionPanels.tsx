import { Action, ActionPanel, Icon, Clipboard, showToast, Toast } from "@raycast/api";

interface UtilityActionPanelsProps {
  type: "export-management" | "import-management";
  onExportApps?: () => void;
  onImportApps?: () => void;
  onGenerateSampleYAML?: () => Promise<string>;
}

export function UtilityActionPanels({
  type,
  onExportApps,
  onImportApps,
  onGenerateSampleYAML,
}: UtilityActionPanelsProps) {
  const handleGenerateSampleYAML = async () => {
    if (onGenerateSampleYAML) {
      const sampleYAML = await onGenerateSampleYAML();
      await Clipboard.copy(sampleYAML);
      await showToast({
        style: Toast.Style.Success,
        title: "Sample YAML Copied",
        message: "Sample YAML content copied to clipboard",
      });
    }
  };

  if (type === "export-management") {
    return (
      <ActionPanel>
        <Action title="Export Apps" icon={Icon.Download} onAction={onExportApps} />
        <Action
          title="Generate Sample Yaml"
          icon={Icon.Document}
          onAction={handleGenerateSampleYAML}
        />
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
