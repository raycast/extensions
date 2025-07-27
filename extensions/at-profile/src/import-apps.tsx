import { Icon, List, open, showHUD } from "@raycast/api";
import { ImportActionPanels } from "./components";
import { showFailureToast } from "@raycast/utils";
import { importSettingsFromFile } from "./yaml-settings";
import { useState } from "react";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export default function ImportAppsCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Try to use a simpler file picker approach
      const { stdout, stderr } = await execAsync(
        `osascript -e 'set theFile to choose file with prompt "Select YAML file to import" of type {"yaml", "yml"} default location (path to home folder)' -e 'return POSIX path of theFile'`,
      );

      console.log("AppleScript stdout:", stdout);
      console.log("AppleScript stderr:", stderr);

      const filePath = stdout.trim();
      if (!filePath || filePath === "") {
        console.log("No file selected or empty path");
        setIsLoading(false);
        return; // User cancelled or no file selected
      }

      console.log("Selected file path:", filePath);
      await importSettingsFromFile(filePath);
      setImportSuccess(true);
      await showHUD("Apps Imported Successfully");
    } catch (err) {
      console.error("File selection error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      // If AppleScript fails, fall back to asking user to select in Finder
      if (errorMessage.includes("User canceled") || errorMessage.includes("cancelled")) {
        setIsLoading(false);
        return; // User cancelled, don't show error
      }

      // Try fallback method - ask user to select file in Finder first
      try {
        await importSettingsFromFile(); // This will try to get from Finder selection
        setImportSuccess(true);
        await showHUD("Apps Imported Successfully");
      } catch (fallbackErr) {
        const fallbackMessage = fallbackErr instanceof Error ? fallbackErr.message : "Unknown error";
        setError(`File picker failed. ${fallbackMessage}`);
        await showFailureToast(`File picker failed. ${fallbackMessage}`, { title: "Import Failed" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openDocumentation = async () => {
    await open("https://github.com/raycast/extensions/tree/main/extensions/at-profile#export-format");
  };

  const getEmptyStateProps = () => {
    if (importSuccess) {
      return {
        icon: Icon.CheckCircle,
        title: "Import Complete",
        description: "Your app settings have been successfully imported.",
        actions: (
          <ImportActionPanels
            state="success"
            onSelectFile={handleSelectFile}
            onImportAgain={() => {
              setImportSuccess(false);
              setError(null);
              handleSelectFile();
            }}
            onOpenDocumentation={openDocumentation}
          />
        ),
      };
    }

    if (error) {
      return {
        icon: Icon.XMarkCircle,
        title: "Import Failed",
        description: error,
        actions: (
          <ImportActionPanels state="error" onSelectFile={handleSelectFile} onOpenDocumentation={openDocumentation} />
        ),
      };
    }

    return {
      icon: { source: "at-icon@128px.png" },
      title: "Import Apps",
      description:
        "Select a YAML file to import apps. You can also select a YAML file in Finder before running this command.",
      actions: (
        <ImportActionPanels state="initial" onSelectFile={handleSelectFile} onOpenDocumentation={openDocumentation} />
      ),
    };
  };

  return (
    <List isLoading={isLoading}>
      <List.EmptyView {...getEmptyStateProps()} />
    </List>
  );
}
