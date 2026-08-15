import { Action, ActionPanel, Icon } from "@raycast/api";
import ExportAppsCommand from "../export-apps";
import ImportAppsCommand from "../import-apps";

interface UtilityActionPanelsProps {
  type: "export-management" | "import-management";
}

export function UtilityActionPanels({ type }: UtilityActionPanelsProps) {
  if (type === "export-management") {
    return (
      <ActionPanel>
        <Action.Push title="Export Apps" icon={Icon.Download} target={<ExportAppsCommand />} />
      </ActionPanel>
    );
  }

  if (type === "import-management") {
    return (
      <ActionPanel>
        <Action.Push title="Import Apps" icon={Icon.Upload} target={<ImportAppsCommand />} />
      </ActionPanel>
    );
  }

  return <ActionPanel />;
}
