import { Icon, List, open, showHUD } from "@raycast/api";
import { ImportActionPanels } from "./components";
import { showFailureToast, runAppleScript } from "@raycast/utils";
import { importSettingsFromFile } from "./yaml-settings";
import { useState, useEffect } from "react";

export default function ImportAppsCommand() {
  const [isLoading, setIsLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Proactively check for YAML files selected in Finder when command starts
  useEffect(() => {
    const checkFinderSelection = async () => {
      try {
        // Use AppleScript to check Finder selection regardless of foreground app
        const finderSelectionScript = `
          tell application "Finder"
            try
              set selectedItems to selection
              if (count of selectedItems) > 0 then
                set firstItem to item 1 of selectedItems
                return POSIX path of (firstItem as alias)
              else
                return "NO_SELECTION"
              end if
            on error
              return "NO_FINDER_WINDOW"
            end try
          end tell
        `;

        const result = await runAppleScript(finderSelectionScript, { timeout: 5000 });
        console.log("Finder selection check result:", result);

        if (result && result !== "NO_SELECTION" && result !== "NO_FINDER_WINDOW" && result.startsWith("/")) {
          const selectedFile = result.trim();
          if (selectedFile.toLowerCase().endsWith(".yaml") || selectedFile.toLowerCase().endsWith(".yml")) {
            console.log("Found YAML file selected in Finder:", selectedFile);
            setIsLoading(true);
            try {
              await importSettingsFromFile(selectedFile);
              setImportSuccess(true);
              await showHUD("Apps Imported Successfully (from Finder selection)");
            } catch (importErr) {
              console.error("Failed to import from Finder selection:", importErr);
              const errorMessage = importErr instanceof Error ? importErr.message : "Unknown error";
              setError(`Import failed: ${errorMessage}`);
              await showFailureToast(`Failed to import from Finder selection: ${errorMessage}`, {
                title: "Import Failed",
              });
            } finally {
              setIsLoading(false);
            }
            return;
          } else {
            console.log("File selected in Finder is not a YAML file:", selectedFile);
          }
        } else if (result === "NO_SELECTION") {
          console.log("No files selected in Finder");
        } else if (result === "NO_FINDER_WINDOW") {
          console.log("No Finder windows open or accessible");
        }
      } catch (err) {
        console.log("Could not check Finder selection:", err);
        // This is expected and not an error - just means no Finder selection available
      }
    };

    checkFinderSelection();
  }, []);

  const handleSelectFile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use Raycast's runAppleScript utility for better compatibility
      const result = await runAppleScript(
        `set theFile to choose file with prompt "Select YAML file to import"
return POSIX path of theFile`,
        { timeout: 30000 },
      );

      console.log("AppleScript result:", result);

      // Validate file path
      if (!result || !result.startsWith("/")) {
        throw new Error("Invalid file path returned from file picker");
      }

      // Validate that the selected file is a YAML file
      if (!result.toLowerCase().endsWith(".yaml") && !result.toLowerCase().endsWith(".yml")) {
        throw new Error("Please select a YAML file (.yaml or .yml extension)");
      }

      console.log("Selected file path:", result);
      await importSettingsFromFile(result);
      setImportSuccess(true);
      await showHUD("Apps Imported Successfully");
    } catch (err) {
      console.error("File selection error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      // Handle user cancellation (AppleScript throws error when user cancels)
      if (
        errorMessage.includes("User canceled") ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("-128") ||
        (err instanceof Error && err.message.includes("execution error"))
      ) {
        console.log("User cancelled file selection");
        setIsLoading(false);
        return; // User cancelled, don't show error
      }

      // Check for permission or system-level errors
      if (errorMessage.includes("permission") || errorMessage.includes("not allowed")) {
        setError(
          "Permission denied. Please grant Raycast permission to access files in System Preferences > Security & Privacy > Privacy > Files and Folders.",
        );
        await showFailureToast("Permission denied. Please check system permissions.", { title: "Import Failed" });
        setIsLoading(false);
        return;
      }

      // Try fallback: get file from Finder selection
      try {
        console.log("Trying Finder selection fallback...");
        await importSettingsFromFile(); // This will try to get from Finder selection
        setImportSuccess(true);
        await showHUD("Apps Imported Successfully (via Finder selection)");
        return;
      } catch (finderErr) {
        console.log("Finder selection fallback failed:", finderErr);
      }

      // Show user-friendly error message
      const friendlyMessage = errorMessage.includes("YAML file")
        ? errorMessage
        : "File picker failed. Please select a YAML file in Finder, then try the Import command again.";

      setError(friendlyMessage);
      await showFailureToast(friendlyMessage, { title: "Import Failed" });
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
        "Import apps from a YAML file. This command will automatically detect YAML files selected in Finder, or you can manually select a file using the file picker.",
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
