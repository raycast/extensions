import { Action, ActionPanel, Icon, open } from "@raycast/api";

interface UtilityActionPanelsProps {
  type: "export-management" | "import-management";
}

export function UtilityActionPanels({ type }: UtilityActionPanelsProps) {
  const handleExportApps = async () => {
    const url = "raycast://extensions/chrismessina/at-profile/export-apps";
    await open(url);
  };

  const handleImportApps = async () => {
    const url = "raycast://extensions/chrismessina/at-profile/import-apps";
    await open(url);
  };

  if (type === "export-management") {
    return (
      <ActionPanel>
        <Action title="Export Apps" icon={Icon.Download} onAction={handleExportApps} />
      </ActionPanel>
    );
  }

  if (type === "import-management") {
    return (
      <ActionPanel>
        <Action title="Import Apps" icon={Icon.Upload} onAction={handleImportApps} />
      </ActionPanel>
    );
  }

  return <ActionPanel />;
}
