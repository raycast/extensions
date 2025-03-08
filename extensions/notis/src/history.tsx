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
} from "@raycast/api";
import { useEffect } from "react";
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
  status: "pending" | "success" | "failed" | "read";
  id: string;
  mediaUrls?: string[]; // Media URLs if any
  mediaType?: string; // Media type
}

// Utility functions
const formatDate = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString();
};

// Mark all items as read when viewed in history
const markAllAsRead = async (history: CommandHistoryItem[]): Promise<CommandHistoryItem[]> => {
  // Mark all success items as read by changing their status
  const updatedHistory = history.map((item) =>
    item.status === "success" ? { ...item, status: "read" as const } : item,
  );

  // Save back to LocalStorage
  await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));

  // Save the view timestamp
  await LocalStorage.setItem("lastViewTimestamp", Date.now().toString());

  return updatedHistory;
};

// Audio utility functions
const isAudioFile = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase();
  const isAudio = lowercaseUrl.endsWith(".ogg");
  return isAudio;
};

// Function to download and play OGG audio
const downloadAndPlayAudio = async (url: string): Promise<void> => {
  try {
    console.log(`Starting download and playback for audio: ${url}`);

    // Get FFmpeg path from preferences
    const preferences = getPreferenceValues<{
      ffmpegPath?: string;
    }>();
    const ffmpegPath = preferences.ffmpegPath?.trim() || "ffmpeg";

    // Better handling of ffplay path derivation
    let ffplayPath = "ffplay";
    if (preferences.ffmpegPath?.trim()) {
      console.log(`Custom ffmpeg path provided: ${preferences.ffmpegPath.trim()}`);
      // If the path ends with 'ffmpeg', replace it with 'ffplay'
      if (preferences.ffmpegPath.trim().endsWith("ffmpeg")) {
        ffplayPath = preferences.ffmpegPath.trim().replace(/ffmpeg$/, "ffplay");
        console.log(`Derived ffplay path by replacing 'ffmpeg' with 'ffplay': ${ffplayPath}`);
      } else {
        // Otherwise assume ffplay is in the same directory
        const directory = path.dirname(preferences.ffmpegPath.trim());
        ffplayPath = path.join(directory, "ffplay");
        console.log(`Derived ffplay path using same directory: ${ffplayPath}`);
      }
    } else {
      console.log("Using default ffplay path: ffplay");
    }

    console.log(`Using ffmpeg path: ${ffmpegPath}`);
    console.log(`Using ffplay path: ${ffplayPath}`);

    // Create a temporary file name
    const tmpDir = os.tmpdir();
    const fileName = `notis-audio-${Date.now()}.ogg`;
    const filePath = path.join(tmpDir, fileName);

    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    // Get file buffer and write to disk
    const buffer = await response.buffer();
    await fs.writeFile(filePath, buffer);

    console.log(`Audio saved to: ${filePath}`);

    // Try to use ffplay first (better OGG support)
    try {
      console.log("Attempting to play with ffplay...");
      await execPromise(`${ffplayPath} -nodisp -autoexit "${filePath}"`);
    } catch (ffplayError) {
      console.log("ffplay not available or failed, trying to convert with ffmpeg...");
      try {
        // Try to convert to m4a which macOS can play
        const m4aPath = filePath.replace(".ogg", ".m4a");
        await execPromise(`${ffmpegPath} -i "${filePath}" -c:a aac "${m4aPath}"`);
        await execPromise(`afplay "${m4aPath}"`);

        // Clean up the converted file
        await fs.unlink(m4aPath).catch((err) => console.error("Error deleting converted file:", err));
      } catch (ffmpegError) {
        console.error("ffmpeg conversion failed:", ffmpegError);
        showFailureToast("Unable to play audio", {
          message: "Failed to play audio. Please make sure you have FFmpeg installed.",
        });
      }
    }

    // Clean up the temporary file
    await fs.unlink(filePath).catch((err) => console.error("Error deleting temporary file:", err));
  } catch (error) {
    console.error("Error playing audio:", error);
    console.log("Falling back to browser playback...");
    // Fallback to opening in browser if native playback fails
    showFailureToast("Error Playing Audio", {
      message: "Failed to play audio. Please try again.",
    });
  }
};

// Mark an item as played and read
const markAudioAsPlayed = async (item: CommandHistoryItem): Promise<void> => {
  if (!item.id || item.status !== "success") return;

  // Store the timestamp and ID to prevent duplicate plays
  await LocalStorage.setItem("lastAudioPlayedTimestamp", item.timestamp.toString());
  await LocalStorage.setItem("lastPlayedAudioId", item.id);

  // Mark the item as read
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return;

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];
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
  await downloadAndPlayAudio(audioUrl);

  // Mark as played
  await markAudioAsPlayed(item);
};

/**
 * Displays detailed information about a history item
 */
const HistoryItemDetail = ({ item }: { item: CommandHistoryItem }) => {
  return <List.Item.Detail markdown={`\`\`\`\n${item.command}\n\`\`\`\n\n${item.response.trim()}`} />;
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

  // Mark all items as read when history is loaded
  useEffect(() => {
    if (!isLoading && history.length > 0) {
      // Use a timeout to make sure we don't mark things read immediately on load
      // This ensures the user has actually seen the history
      const timer = setTimeout(async () => {
        const updatedHistory = await markAllAsRead(history);
        setHistory(updatedHistory);
      }, 2000); // 2 second delay

      return () => clearTimeout(timer);
    }
  }, [isLoading, history.length]);

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

  const refreshHistory = async () => {
    // Show a brief loading state and reload from storage
    await showToast({
      style: Toast.Style.Animated,
      title: "Refreshing history",
    });

    // Force a reload from LocalStorage
    const historyJson = await LocalStorage.getItem<string>("commandHistory");
    if (historyJson) {
      try {
        const refreshedHistory = JSON.parse(historyJson) as CommandHistoryItem[];
        setHistory(refreshedHistory);
        await showToast({
          style: Toast.Style.Success,
          title: "History refreshed",
        });
      } catch (error) {
        console.error("Error parsing history:", error);
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to refresh history",
          message: "Error parsing history data",
        });
      }
    }
  };

  // Helper to check if an item has audio
  const hasAudio = (item: CommandHistoryItem): boolean => {
    const result = !!item.mediaUrls && item.mediaUrls.some((url) => isAudioFile(url));
    return result;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search message history..." isShowingDetail>
      {history.length === 0 ? (
        <List.EmptyView title="No Message History" description="Send a message to Notis to see her response here." />
      ) : (
        history.map((item, index) => (
          <List.Item
            key={item.id}
            id={index.toString()}
            icon={
              item.status === "pending"
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
                <ActionPanel.Section title="History Actions">
                  {item.mediaUrls && item.mediaUrls.some((url) => isAudioFile(url)) && (
                    <Action
                      title="Play Audio"
                      icon={Icon.Play}
                      shortcut={{ modifiers: ["opt"], key: "p" }}
                      onAction={() => playItemAudio(item)}
                    />
                  )}

                  <Action
                    title="Refresh"
                    icon={Icon.RotateClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={refreshHistory}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Item Actions">
                  <Action.CopyToClipboard
                    title="Copy Response"
                    content={item.response}
                    icon={Icon.Clipboard}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard title="Copy Command" content={item.command} icon={Icon.Terminal} />

                  {item.mediaUrls && item.mediaUrls.length > 0 && (
                    <Action.OpenInBrowser title="Open Media File" icon={Icon.Link} url={item.mediaUrls[0]} />
                  )}

                  {item.status === "pending" && (
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

                  <Action
                    title="Remove Item"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["ctrl"], key: "x" }}
                    onAction={() => deleteHistoryItem(parseInt(index.toString()))}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Global Actions">
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
  if (item.status === "pending") return "Pending";
  if (item.status === "failed") return "Failed";
  if (item.status === "read") return "Read";

  // For success status
  return "Success";
};

const getStatusTagColor = (item: CommandHistoryItem): string => {
  if (item.status === "pending") return "#007AFF"; // Blue
  if (item.status === "failed") return "#FF6369"; // Red
  if (item.status === "read") return "#8E8E93"; // Gray for read items

  // For success status
  return "#28C941"; // Regular green for unread success
};
