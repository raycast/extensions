import { Icon, List, open, showHUD } from "@raycast/api";
import { ImportActionPanels } from "./components";
import { runAppleScript } from "@raycast/utils";
import { safeAsyncOperation } from "./utils/errors";
import { importSettingsFromFile } from "./yaml-settings";
import { useEffect, useReducer } from "react";

type State = {
  isLoading: boolean;
  importSuccess: boolean;
  error: string | null;
};

type Action = { type: "start" } | { type: "success" } | { type: "failure"; message: string } | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { ...state, isLoading: true, error: null };
    case "success":
      return { isLoading: false, importSuccess: true, error: null };
    case "failure":
      return { ...state, isLoading: false, error: action.message };
    case "reset":
      return { isLoading: false, importSuccess: false, error: null };
    default:
      return state;
  }
}

export default function ImportAppsCommand() {
  const [{ isLoading, importSuccess, error }, dispatch] = useReducer(reducer, {
    isLoading: false,
    importSuccess: false,
    error: null,
  });

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
            dispatch({ type: "start" });
            const result = await safeAsyncOperation(
              async () => {
                await importSettingsFromFile(selectedFile);
                dispatch({ type: "success" });
                await showHUD("Apps Imported Successfully (from Finder selection)");
                return true;
              },
              "importing from Finder selection",
              {
                showToastOnError: true,
                rethrow: false,
                fallbackValue: false,
              },
            );

            if (!result) {
              dispatch({ type: "failure", message: "Import failed" });
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
    dispatch({ type: "start" });

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
      dispatch({ type: "success" });
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
        dispatch({ type: "failure", message: "" });
        return; // User cancelled, don't show error
      }

      // Check for permission or system-level errors
      if (errorMessage.includes("permission") || errorMessage.includes("not allowed")) {
        dispatch({
          type: "failure",
          message:
            "Permission denied. Please grant Raycast permission to access files in System Preferences > Security & Privacy > Privacy > Files and Folders.",
        });
        await safeAsyncOperation(
          async () => {
            throw new Error("Permission denied. Please check system permissions.");
          },
          "Import permission error",
          { toastTitle: "Import Failed" },
        );
        return;
      }

      // Try fallback: get file from Finder selection
      const fallbackResult = await safeAsyncOperation(
        async () => {
          await importSettingsFromFile(); // This will try to get from Finder selection
          dispatch({ type: "success" });
          await showHUD("Apps Imported Successfully (via Finder selection)");
          return true;
        },
        "Finder selection fallback",
        { showToastOnError: false },
      );

      if (fallbackResult) {
        return;
      }

      // Show user-friendly error message
      const friendlyMessage = errorMessage.includes("YAML file")
        ? errorMessage
        : "File picker failed. Please select a YAML file in Finder, then try the Import command again.";

      dispatch({ type: "failure", message: friendlyMessage });
      await safeAsyncOperation(
        async () => {
          throw new Error(friendlyMessage);
        },
        "Import file selection error",
        { toastTitle: "Import Failed" },
      );
    }
  };

  const openDocumentation = async () => {
    await open("https://github.com/raycast/extensions/tree/main/extensions/at-profile/docs/YAML_SETTINGS.md");
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
              dispatch({ type: "reset" });
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
