import {
  ActionPanel,
  Action,
  List,
  getPreferenceValues,
  confirmAlert,
  LocalStorage,
  Icon,
  showToast,
  Toast,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useLocalStorage, showFailureToast } from "@raycast/utils";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import fetch from "node-fetch";

const execPromise = promisify(exec);

// Types and interfaces
interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  status: "queued" | "processing" | "success" | "failed" | "read";
  id: string;
  mediaUrls?: string[]; // Media URLs if any
  mediaType?: string; // Media type
}

// Utility functions
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Utility function to safely read history from LocalStorage
const readHistoryFromStorage = async (): Promise<CommandHistoryItem[]> => {
  try {
    const historyJson = await LocalStorage.getItem<string>("commandHistory");
    if (!historyJson) return [];
    return JSON.parse(historyJson) as CommandHistoryItem[];
  } catch (error) {
    console.error("Error reading history from storage:", error);
    return [];
  }
};

// Mark a single item as read
const markItemAsRead = async (
  item: CommandHistoryItem,
  history: CommandHistoryItem[],
): Promise<CommandHistoryItem[]> => {
  // Only mark success items as read
  if (item.status !== "success") {
    return history;
  }

  // Update the item status
  const updatedHistory = history.map((historyItem) =>
    historyItem.id === item.id ? { ...historyItem, status: "read" as const } : historyItem,
  );

  // Save back to LocalStorage
  await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));

  return updatedHistory;
};

// Audio utility functions
const isAudioFile = (url: string): boolean => {
  return url.toLowerCase().endsWith(".ogg");
};

// Function to play OGG audio directly from URL
const playAudioFromUrl = async (url: string): Promise<void> => {
  try {
    console.log(`Starting playback for audio: ${url}`);

    // Get FFmpeg path from preferences
    const preferences = getPreferenceValues<{
      ffmpegPath?: string;
    }>();
    const ffmpegPath = preferences.ffmpegPath?.trim() || "ffmpeg";
    const ffplayPath = ffmpegPath.endsWith("ffmpeg")
      ? ffmpegPath.replace(/ffmpeg$/, "ffplay")
      : path.join(path.dirname(ffmpegPath), "ffplay");

    console.log(`Using ffmpeg path: ${ffmpegPath}`);
    console.log(`Using ffplay path: ${ffplayPath}`);

    // Try to use ffplay directly with the URL (no download needed)
    try {
      console.log("Attempting to play directly with ffplay...");
      await execPromise(`${ffplayPath} -nodisp -autoexit "${url}"`);
    } catch (ffplayError) {
      console.log("Direct ffplay failed, falling back to temporary download...");

      // Create a temporary file for download
      const tmpDir = os.tmpdir();
      const fileName = `notis-audio-${Date.now()}.ogg`;
      const filePath = path.join(tmpDir, fileName);

      try {
        // Download the file
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to download audio: ${response.statusText}`);
        }

        // Get file buffer and write to disk
        const buffer = await response.buffer();
        await fs.writeFile(filePath, buffer);
        console.log(`Audio temporarily saved to: ${filePath}`);

        // Try ffplay on the local file
        try {
          await execPromise(`${ffplayPath} -nodisp -autoexit "${filePath}"`);
        } catch (localFfplayError) {
          // Try to convert to m4a which macOS can play
          console.log("Local ffplay failed, converting to m4a...");
          const m4aPath = filePath.replace(".ogg", ".m4a");
          await execPromise(`${ffmpegPath} -i "${filePath}" -c:a aac "${m4aPath}"`);
          await execPromise(`afplay "${m4aPath}"`);

          // Clean up the converted file
          await fs.unlink(m4aPath).catch((err) => console.error("Error deleting converted file:", err));
        }

        // Clean up the temporary file
        await fs.unlink(filePath).catch((err) => console.error("Error deleting temporary file:", err));
      } catch (error) {
        console.error("Error with temporary file approach:", error);
        throw error;
      }
    }
  } catch (error) {
    console.error("Error playing audio:", error);
    console.log("Falling back to browser playback...");
    // Fallback to opening in browser if native playback fails
    showFailureToast("Error Playing Audio", {
      message: "Failed to play audio. Please try again or open in browser.",
    });
  }
};

// Mark an item as played and read
const markAudioAsPlayed = async (item: CommandHistoryItem): Promise<void> => {
  if (!item.id || item.status !== "success") return;

  // Mark the item as read
  try {
    const history = await readHistoryFromStorage();
    const updatedHistory = history.map((historyItem) =>
      historyItem.id === item.id ? { ...historyItem, status: "read" as const } : historyItem,
    );

    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Error updating read status:", error);
  }
};

// Play audio for an item
const playItemAudio = async (item: CommandHistoryItem): Promise<void> => {
  console.log(`Attempting to play audio for item: ${item.id}`);
  console.log(`Media URLs: ${JSON.stringify(item.mediaUrls)}`);

  if (!item.mediaUrls || item.mediaUrls.length === 0) {
    console.log("No audio files to play - mediaUrls is empty");
    return;
  }

  // Find the first audio file
  const audioUrl = item.mediaUrls.find((url) => isAudioFile(url));
  if (!audioUrl) {
    console.log("No OGG audio files found in mediaUrls");
    return;
  }

  console.log(`Found audio URL to play: ${audioUrl}`);

  // Play the audio file
  await playAudioFromUrl(audioUrl);

  // Mark as played
  await markAudioAsPlayed(item);
};

/**
 * Displays detailed information about a history item
 */
const HistoryItemDetail = ({ item }: { item: CommandHistoryItem }) => {
  return <List.Item.Detail markdown={`${item.command}\n\n\n---\n\n${item.response}`} />;
};

/**
 * Component to display command history list
 */
export default function Command() {
  const {
    value: history = [],
    isLoading,
    setValue: setHistory,
  } = useLocalStorage<CommandHistoryItem[]>("commandHistory", []);

  // Track the currently selected item
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Continuous synchronization with local storage
  useEffect(() => {
    // Function to check for updates in local storage
    const checkForUpdates = async () => {
      try {
        const storedHistory = await readHistoryFromStorage();

        // Quick length check first
        if (storedHistory.length !== history.length) {
          console.log("History length changed, updating state");
          setHistory(storedHistory);
          return;
        }

        // More detailed comparison if lengths match
        let hasChanges = false;

        // Only check the first few items (most recent) for efficiency
        const itemsToCheck = Math.min(storedHistory.length, 10);

        for (let i = 0; i < itemsToCheck; i++) {
          const storedItem = storedHistory[i];
          const currentItem = history[i];

          // Skip if same item with same status and response
          if (
            storedItem.id === currentItem.id &&
            storedItem.status === currentItem.status &&
            storedItem.response === currentItem.response &&
            (storedItem.mediaUrls?.length || 0) === (currentItem.mediaUrls?.length || 0)
          ) {
            continue;
          }

          hasChanges = true;
          break;
        }

        if (hasChanges) {
          console.log("History content changed, updating state");
          setHistory(storedHistory);
        }
      } catch (error) {
        console.error("Error checking for history updates:", error);
      }
    };

    // Set up polling interval (every 2 seconds)
    const intervalId = setInterval(checkForUpdates, 2000);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [history, setHistory]);

  // Mark item as read when selected
  useEffect(() => {
    if (selectedItemId) {
      const selectedItem = history.find((item) => item.id === selectedItemId);
      if (selectedItem && selectedItem.status === "success") {
        (async () => {
          const updatedHistory = await markItemAsRead(selectedItem, history);
          setHistory(updatedHistory);
        })();
      }
    }
  }, [selectedItemId]);

  const deleteHistoryItem = async (index: number) => {
    const newHistory = [...history];
    newHistory.splice(index, 1);
    setHistory(newHistory);
    await showToast({
      style: Toast.Style.Success,
      title: "Item removed",
    });
  };

  const clearAllHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to delete all command history? This action cannot be undone.",
    });

    if (confirmed) {
      setHistory([]);
      await showToast({
        style: Toast.Style.Success,
        title: "History cleared",
        message: "All history items have been removed",
      });
    }
  };

  const refreshHistory = async (updatedMessages?: CommandHistoryItem[]) => {
    // If messages are provided, use them directly
    if (updatedMessages) {
      setHistory(updatedMessages);
      await showToast({
        style: Toast.Style.Success,
        title: "History refreshed",
      });
      return;
    }

    // Otherwise, show a brief loading state and reload from storage
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing history",
    });

    try {
      const refreshedHistory = await readHistoryFromStorage();
      setHistory(refreshedHistory);
      await showToast({
        style: Toast.Style.Success,
        title: "History refreshed",
      });
    } catch (error) {
      console.error("Error refreshing history:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to refresh history",
        message: "Error loading history data",
      });
    }
  };

  // Helper to check if an item has audio
  const hasAudio = (item: CommandHistoryItem): boolean => {
    return !!item.mediaUrls && item.mediaUrls.some((url) => isAudioFile(url));
  };

  // Add pending request to history
  const addPendingRequest = async (command: string): Promise<string> => {
    const requestId = `RC${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;

    const newItem: CommandHistoryItem = {
      id: requestId,
      command,
      response: "",
      timestamp: Date.now(),
      status: "queued",
    };

    // Get current history and add new item
    const history = await readHistoryFromStorage();
    const updatedHistory = [newItem, ...history].slice(0, 50);
    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));

    return requestId;
  };

  // Function to resend a command
  const resendCommand = async (command: string, existingItemId?: string): Promise<void> => {
    try {
      console.log("Starting to resend command:", command);

      let updatedHistory: CommandHistoryItem[] = [];

      if (existingItemId) {
        // Get current history
        const historyList = await readHistoryFromStorage();
        const existingItem = historyList.find((item) => item.id === existingItemId);

        if (existingItem) {
          // Update the item status and timestamp
          const updatedItem = {
            ...existingItem,
            status: "queued" as const,
            timestamp: Date.now(),
          };

          // Remove the existing item and add updated version to the top
          updatedHistory = historyList.filter((item) => item.id !== existingItemId);
          updatedHistory.unshift(updatedItem);

          // Save the updated history
          await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
          console.log("Updated existing item and moved to top of list");
        } else {
          // If item not found, create a new one
          await addPendingRequest(command);
          updatedHistory = await readHistoryFromStorage();
        }
      } else {
        // No existing item ID provided, create a new request
        await addPendingRequest(command);
        updatedHistory = await readHistoryFromStorage();
      }

      // Launch the menu-bar command to process the request
      console.log("Launching menu-bar-command");
      await launchCommand({
        name: "menu-bar-command",
        type: LaunchType.Background,
      });

      // Show success notification
      await showToast({
        style: Toast.Style.Success,
        title: "📤 Message sent to Notis",
      });

      // Refresh the history with the updated messages we already have
      await refreshHistory(updatedHistory);
    } catch (error) {
      console.error("Error resending command:", error);

      showFailureToast("Error Sending Message", {
        message: "Please ensure the menu bar command is running",
      });
    }
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search message history..."
      isShowingDetail
      navigationTitle="Message History"
      onSelectionChange={(id) => {
        if (id) {
          const index = parseInt(id);
          if (!isNaN(index) && index >= 0 && index < history.length) {
            setSelectedItemId(history[index].id);
          }
        }
      }}
    >
      {history.length === 0 ? (
        <List.EmptyView title="No Message History" description="Send a message to Notis to see her response here." />
      ) : (
        history.map((item, index) => (
          <List.Item
            key={item.id}
            id={index.toString()}
            icon={
              item.status === "queued"
                ? { source: "clock", tintColor: "blue" }
                : item.status === "success"
                  ? { source: "checkmark-circle.fill", tintColor: "green" }
                  : item.status === "read"
                    ? { source: "checkmark-circle", tintColor: "green" }
                    : { source: "xmark-circle", tintColor: "red" }
            }
            title={formatDate(item.timestamp)}
            accessories={[
              {
                icon: hasAudio(item) ? Icon.Play : undefined,
                tag: {
                  value: getStatusTagValue(item),
                  color: getStatusTagColor(item),
                },
              },
            ]}
            detail={<HistoryItemDetail item={item} />}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Item Actions">
                  {item.mediaUrls && item.mediaUrls.some((url) => isAudioFile(url)) && (
                    <Action
                      title="Play Audio"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["opt"], key: "p" }}
                      onAction={() => playItemAudio(item)}
                    />
                  )}
                  <Action.CopyToClipboard
                    title="Copy Response"
                    content={item.response}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard title="Copy Command" content={item.command} icon={Icon.Terminal} />

                  <Action
                    title="Resend"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={() => resendCommand(item.command, item.id)}
                  />

                  {item.mediaUrls && item.mediaUrls.length > 0 && (
                    <Action.OpenInBrowser title="Open Media File" icon={Icon.Link} url={item.mediaUrls[0]} />
                  )}

                  {item.status === "queued" && (
                    <Action
                      title="Mark as Failed"
                      icon={Icon.XMarkCircle}
                      shortcut={{ modifiers: ["cmd"], key: "f" }}
                      onAction={() => {
                        const updatedHistory = history.map((historyItem) =>
                          historyItem.id === item.id ? { ...historyItem, status: "failed" as const } : historyItem,
                        );
                        setHistory(updatedHistory);
                      }}
                    />
                  )}

                  {item.status === "success" && (
                    <Action
                      title="Mark as Read"
                      icon={Icon.Eye}
                      shortcut={{ modifiers: ["cmd"], key: "m" }}
                      onAction={async () => {
                        const updatedHistory = await markItemAsRead(item, history);
                        setHistory(updatedHistory);
                        await showToast({
                          style: Toast.Style.Success,
                          title: "Marked as read",
                        });
                      }}
                    />
                  )}

                  <Action
                    title="Remove Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteHistoryItem(parseInt(index.toString()))}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="History Actions">
                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                    onAction={() => refreshHistory()}
                  />

                  <Action
                    title="Clear All History"
                    icon={Icon.ExclamationMark}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "x" }}
                    onAction={clearAllHistory}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

// Helper functions for status tags
const getStatusTagValue = (item: CommandHistoryItem): string => {
  switch (item.status) {
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "failed":
      return "Failed";
    case "read":
      return "Read";
    case "success":
      return "Success";
    default:
      return item.status;
  }
};

const getStatusTagColor = (item: CommandHistoryItem): string => {
  switch (item.status) {
    case "queued":
      return "#007AFF"; // Blue
    case "processing":
      return "#5856D6"; // Purple
    case "failed":
      return "#FF6369"; // Red
    case "read":
      return "#8E8E93"; // Gray for read items
    case "success":
      return "#28C941"; // Green for unread success
    default:
      return "#8E8E93"; // Default gray
  }
};
