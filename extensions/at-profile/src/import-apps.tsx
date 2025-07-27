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
      // Try AppleScript file picker with enhanced error handling
      const { stdout, stderr } = await execAsync(
        `osascript -e 'try' -e 'set theFile to choose file with prompt "Select YAML file to import" of type {"yaml", "yml"} default location (path to home folder)' -e 'return POSIX path of theFile' -e 'on error errText number errNum' -e 'if errNum is -128 then' -e 'return "USER_CANCELLED"' -e 'else' -e 'return "ERROR: " & errText' -e 'end if' -e 'end try'`,
        { timeout: 30000 } // 30 second timeout
      );

      console.log("AppleScript stdout:", stdout);
      console.log("AppleScript stderr:", stderr);

      const result = stdout.trim();
      
      // Handle specific AppleScript responses
      if (result === "USER_CANCELLED" || result === "") {
        console.log("User cancelled file selection");
        setIsLoading(false);
        return; // User cancelled, don't show error
      }
      
      if (result.startsWith("ERROR:")) {
        const errorDetails = result.substring(6).trim();
        throw new Error(`AppleScript error: ${errorDetails}`);
      }

      // Validate file path
      if (!result || result === "" || !result.startsWith("/")) {
        throw new Error("Invalid file path returned from file picker");
      }

      console.log("Selected file path:", result);
      await importSettingsFromFile(result);
      setImportSuccess(true);
      await showHUD("Apps Imported Successfully");
    } catch (err) {
      console.error("File selection error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";

      // Handle different types of errors
      if (errorMessage.includes("USER_CANCELLED") || 
          errorMessage.includes("User canceled") || 
          errorMessage.includes("cancelled") ||
          errorMessage.includes("-128")) {
        setIsLoading(false);
        return; // User cancelled, don't show error
      }

      // Check for permission or system-level errors
      if (errorMessage.includes("permission") || errorMessage.includes("not allowed")) {
        setError("Permission denied. Please grant Raycast permission to access files in System Preferences > Security & Privacy > Privacy > Files and Folders.");
        await showFailureToast("Permission denied. Please check system permissions.", { title: "Import Failed" });
        setIsLoading(false);
        return;
      }

      // Try enhanced fallback strategies
      console.log("Attempting fallback methods...");
      
      // Fallback 1: Try to get file from Finder selection
      try {
        console.log("Trying Finder selection fallback...");
        await importSettingsFromFile(); // This will try to get from Finder selection
        setImportSuccess(true);
        await showHUD("Apps Imported Successfully (via Finder selection)");
        return;
      } catch (finderErr) {
        console.log("Finder selection fallback failed:", finderErr);
      }

      // Fallback 2: Try simpler AppleScript without file type restrictions
      try {
        console.log("Trying simplified AppleScript fallback...");
        const { stdout: fallbackStdout } = await execAsync(
          `osascript -e 'try' -e 'set theFile to choose file with prompt "Select YAML file to import"' -e 'return POSIX path of theFile' -e 'on error' -e 'return "CANCELLED"' -e 'end try'`,
          { timeout: 15000 }
        );
        
        const fallbackResult = fallbackStdout.trim();
        if (fallbackResult && fallbackResult !== "CANCELLED" && fallbackResult.startsWith("/")) {
          await importSettingsFromFile(fallbackResult);
          setImportSuccess(true);
          await showHUD("Apps Imported Successfully");
          return;
        }
      } catch (simplifiedErr) {
        console.log("Simplified AppleScript fallback failed:", simplifiedErr);
      }

      // All fallbacks failed
      const friendlyMessage = errorMessage.includes("AppleScript") 
        ? "File picker is not available. Please select a YAML file in Finder, then try again."
        : `Import failed: ${errorMessage}`;
      
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
