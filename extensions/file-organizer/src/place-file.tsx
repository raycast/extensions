import { ActionPanel, Action, Icon, List, showToast, Toast, confirmAlert, Alert, showHUD } from "@raycast/api";
import { useEffect, useState, useRef } from "react";
import { analyzeFile } from "./utils/fileAnalyzer";
import { suggestLocations } from "./utils/locationSuggester";
import { moveFile } from "./utils/fileOperations";
import { LocationSuggestion } from "./utils/types";
import path from "path";
import { runAppleScript, showFailureToast } from "@raycast/utils";

// Status enum to provide more granular loading states
enum LoadingStatus {
  SELECTING_FILE = "Selecting File...",
  ANALYZING_FILE = "Analyzing File...",
  FINDING_LOCATIONS = "Finding Locations...",
  READY = "Ready",
  ERROR = "Error",
}

/**
 * Gets files currently selected in Finder
 */
async function getFinderSelection(): Promise<string | null> {
  try {
    const script = `
      tell application "Finder"
        set selectedItems to selection
        if selectedItems is {} then
          return ""
        else
          set firstItem to item 1 of selectedItems
          return POSIX path of (firstItem as alias)
        end if
      end tell
    `;

    const result = await runAppleScript(script);
    const filePath = result.trim();

    if (filePath) {
      return filePath;
    }
    return null;
  } catch (error) {
    console.error("Error getting Finder selection:", error);

    // Check if this is a permissions error
    const errorMessage = String(error);
    if (errorMessage.includes("Not authorized") || errorMessage.includes("Apple events to Finder")) {
      await showToast(
        Toast.Style.Failure,
        "Permission Required for Finder Access",
        "Go to System Settings → Privacy & Security → Automation and enable Raycast to control Finder",
      );
    }

    return null;
  }
}

/**
 * Gets a file path from a file picker dialog
 */
async function getFilePath(): Promise<string | null> {
  try {
    // First try getting the currently selected file in Finder
    const finderSelection = await getFinderSelection();
    if (finderSelection) {
      await showToast(Toast.Style.Success, "Using file selected in Finder");
      return finderSelection;
    }
    await showFailureToast(
      "No file selected in Finder. Check Raycasts permissions, select a file in Finder and try again",
    );

    return null;
  } catch (error) {
    console.error("Error with file picker:", error);
    await showToast(Toast.Style.Failure, "Could not select file", "Please try again");
    return null;
  }
}

/**
 * Formats a location path for display, shortening if too long
 */
function formatLocationPath(fullPath: string): string {
  const homeDirPath = process.env.HOME || "~";
  const shortPath = fullPath.replace(homeDirPath, "~");

  // If path is too long, abbreviate middle parts
  if (shortPath.length > 50) {
    const parts = shortPath.split("/");
    if (parts.length > 4) {
      return `${parts[0]}/${parts[1]}/.../${parts[parts.length - 1]}`;
    }
  }

  return shortPath;
}

/**
 * Get a confidence emoji based on the score
 */
function getConfidenceEmoji(confidence: number): string {
  return confidence > 80 ? "⭐️" : confidence > 60 ? "✨" : confidence > 40 ? "👍" : "📁";
}

/**
 * Main component for the organize file view
 */
export default function Command() {
  const [status, setStatus] = useState<LoadingStatus>(LoadingStatus.SELECTING_FILE);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [locations, setLocations] = useState<LocationSuggestion[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Use ref to prevent duplicate file selection when useEffect runs twice
  const isLoadingRef = useRef(false);

  // Load data on mount
  useEffect(() => {
    // Only run once even if useEffect is called twice (React StrictMode)
    if (isLoadingRef.current) {
      return;
    }

    // Mark as loading to prevent duplicate execution
    isLoadingRef.current = true;

    async function loadData() {
      try {
        // Set initial status
        setStatus(LoadingStatus.SELECTING_FILE);

        // Get the file path
        const filePath = await getFilePath();

        if (!filePath) {
          setStatus(LoadingStatus.ERROR);
          setErrorMessage("No file selected. Check Raycasts permissions, select a file in Finder and try again");
          return;
        }

        setSelectedFile(filePath);

        // Update status to analyzing
        setStatus(LoadingStatus.ANALYZING_FILE);
        await showToast(Toast.Style.Success, "Analyzing file...");

        // Analyze the file
        const fileInfo = await analyzeFile(filePath);

        // Update status to finding locations
        setStatus(LoadingStatus.FINDING_LOCATIONS);
        await showToast(Toast.Style.Success, `Finding suitable locations for ${path.basename(filePath)}...`);

        // Get location suggestions
        const suggestions = await Promise.race([
          suggestLocations(fileInfo),
          // add timeout to prevent running a long time on slow machines with big files systems
          new Promise<LocationSuggestion[]>((_, reject) =>
            setTimeout(() => reject(new Error("Location suggestion timed out after 20 seconds")), 20000),
          ),
        ]);

        if (suggestions.length === 0) {
          setStatus(LoadingStatus.ERROR);
          setErrorMessage("No suitable locations found for this file");
        } else {
          // Sort by confidence
          setLocations(suggestions.sort((a, b) => b.confidence - a.confidence));
          setStatus(LoadingStatus.READY);
        }
      } catch (error) {
        console.error(error);
        setStatus(LoadingStatus.ERROR);
        setErrorMessage(`Error: ${String(error)}`);
      }
    }

    loadData();
  }, []);

  /**
   * Handle the move action
   */
  const handleMoveAction = async (location: LocationSuggestion) => {
    if (!selectedFile) return;

    try {
      // Confirm before moving
      const confirmed = await confirmAlert({
        title: "Move File",
        message: `Are you sure you want to move the file to ${location.path}?`,
        primaryAction: {
          title: "Move",
          style: Alert.ActionStyle.Default,
        },
      });

      if (confirmed) {
        await moveFile(selectedFile, location.path);
        await showHUD(`File moved to ${path.basename(location.path)}`);

        // Return the destination path so it can be used to open Finder
        return location.path;
      }
      return null;
    } catch (error) {
      console.error(error);
      await showToast(Toast.Style.Failure, "Failed to move file", String(error));
      return null;
    }
  };

  // If there's an error, show it
  if (errorMessage && status === LoadingStatus.ERROR) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="Error"
          description={errorMessage}
          actions={
            <ActionPanel>
              <Action
                title="Try Again"
                onAction={() => {
                  isLoadingRef.current = false;
                  setStatus(LoadingStatus.SELECTING_FILE);
                  setErrorMessage(null);
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Set loading title based on current status
  const loadingTitle = status !== LoadingStatus.READY ? status.toString() : "";

  return (
    <List
      isLoading={status !== LoadingStatus.READY && status !== LoadingStatus.ERROR}
      searchBarPlaceholder="Search locations..."
    >
      {status !== LoadingStatus.READY ? (
        <List.EmptyView
          icon={Icon.Clock}
          title={loadingTitle}
          description={selectedFile ? `Processing ${path.basename(selectedFile)}` : "Please wait..."}
        />
      ) : (
        <List.Section
          title={`Suggested locations for file: ${path.basename(selectedFile ?? "")}`}
          subtitle={locations.length > 0 ? `${locations.length} options` : undefined}
        >
          {locations.map((location) => {
            const confidence = Math.round(location.confidence * 100);
            const emoji = getConfidenceEmoji(confidence);
            const basename = path.basename(location.path);

            return (
              <List.Item
                key={location.path}
                title={basename}
                subtitle={location.reason}
                icon={emoji}
                accessories={[
                  { text: `${confidence}%`, tooltip: "Confidence score" },
                  { text: formatLocationPath(location.path), tooltip: location.path },
                ]}
                actions={
                  <ActionPanel>
                    <Action title="Move File Here" icon={Icon.ArrowRight} onAction={() => handleMoveAction(location)} />
                    <Action.ShowInFinder path={location.path} />
                    <Action
                      title="Move and Open in Finder"
                      icon={Icon.Finder}
                      shortcut={{ modifiers: ["cmd"], key: "enter" }}
                      onAction={async () => {
                        const destinationPath = await handleMoveAction(location);
                        if (destinationPath) {
                          await showToast(Toast.Style.Success, "Opening in Finder...");
                          await runAppleScript(`tell application "Finder" to open POSIX file "${destinationPath}"`);
                        }
                      }}
                    />
                    <Action.CopyToClipboard
                      title="Copy Path"
                      content={location.path}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
