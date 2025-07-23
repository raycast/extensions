import { Icon, List, showHUD } from "@raycast/api";
import { ExportActionPanels } from "./components";
import { showFailureToast } from "@raycast/utils";
import { exportSettingsToFile } from "./yaml-settings";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function ExportAppsCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [exportedFilePath, setExportedFilePath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filePath = await exportSettingsToFile();
      setExportedFilePath(filePath);
      await showHUD("Apps Exported Successfully");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      await showFailureToast(errorMessage, { title: "Export Failed" });
    } finally {
      setIsLoading(false);
    }
  };

  const showInFinder = async () => {
    if (!exportedFilePath) return;

    try {
      await execAsync(`open -R "${exportedFilePath}"`);
    } catch (err) {
      await showFailureToast("Failed to show file in Finder", { title: "Error" });
    }
  };

  const getEmptyStateProps = () => {
    if (exportedFilePath) {
      return {
        icon: Icon.CheckCircle,
        title: "Export Complete",
        description: "Your app settings have been exported successfully.",
        actions: (
          <ExportActionPanels
            state="success"
            onExport={handleExport}
            onShowInFinder={showInFinder}
          />
        ),
      };
    }

    if (error) {
      return {
        icon: Icon.XMarkCircle,
        title: "Export Failed",
        description: error,
        actions: (
          <ExportActionPanels
            state="error"
            onExport={handleExport}
          />
        ),
      };
    }

    return {
      icon: { source: "at-icon@128px.png" },
      title: "Export Apps",
      description: "Export your Apps and Profile history to a YAML file.",
      actions: (
        <ExportActionPanels
          state="initial"
          onExport={handleExport}
        />
      ),
    };
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView {...getEmptyStateProps()} />
    </List>
  );
}
