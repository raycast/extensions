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
import { exec, ChildProcess } from "child_process";
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

// Mark a single item as read (or played status which is 'read')
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
  // console.log(`Item ${item.id} marked as read in LocalStorage.`); // Optional logging
  return updatedHistory;
};

// Audio utility functions
const isAudioFile = (url: string): boolean => {
  return url.toLowerCase().endsWith(".ogg");
};

// --- Audio Playback State ---
let isAudioPlaying = false;
let currentAudioProcess: ChildProcess | null = null;
let currentPlayingItemId: string | null = null;

// Function to mark audio as played (updates status to 'read' in storage)
// Renamed from the general markItemAsRead to be specific for audio completion
const markAudioAsPlayed = async (item: CommandHistoryItem): Promise<void> => {
  if (!item || item.status !== "success") return;

  console.log(`Attempting to mark audio item ${item.id} as played (read).`);
  try {
    const history = await readHistoryFromStorage();
    // Find the specific item again to ensure we have the latest status before marking
    const currentItemState = history.find((h) => h.id === item.id);
    if (currentItemState && currentItemState.status === "success") {
      const updatedHistory = history.map((historyItem) =>
        historyItem.id === item.id ? { ...historyItem, status: "read" as const } : historyItem,
      );
      await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
      console.log(`Item ${item.id} marked as read in LocalStorage after playback.`);
    } else {
      console.log(`Item ${item.id} status was not 'success' when attempting to mark as played, or item not found.`);
    }
  } catch (error) {
    console.error(`Error updating read status for item ${item.id}:`, error);
  }
};

// Function to play OGG audio, ensuring only one plays at a time
const playAudioFromUrl = async (url: string, itemId: string): Promise<void> => {
  // --- Stop any currently playing audio ---
  if (isAudioPlaying && currentAudioProcess && currentAudioProcess.pid) {
    console.log(`Stopping existing audio playback (item: ${currentPlayingItemId}, pid: ${currentAudioProcess.pid})...`);
    try {
      // Sending SIGTERM gracefully first
      const killed = currentAudioProcess.kill("SIGTERM");
      if (!killed) {
        console.log("Failed to send SIGTERM, trying SIGKILL...");
        currentAudioProcess.kill("SIGKILL"); // Force kill if SIGTERM failed
      }
    } catch (killError) {
      console.error(`Error stopping previous audio process (pid: ${currentAudioProcess.pid}):`, killError);
    }
    // Reset state immediately after kill attempt
    isAudioPlaying = false;
    currentAudioProcess = null;
    currentPlayingItemId = null;
  }

  // Set loading state immediately
  isAudioPlaying = true;
  currentPlayingItemId = itemId; // Track the new item ID
  await showToast({ style: Toast.Style.Animated, title: "Playing audio..." });

  try {
    console.log(`Starting playback for audio: ${url} (item: ${itemId})`);
    const preferences = getPreferenceValues<{ ffmpegPath?: string }>();
    const ffmpegPath = preferences.ffmpegPath?.trim() || "ffmpeg";
    const ffplayPath = ffmpegPath.endsWith("ffmpeg")
      ? ffmpegPath.replace(/ffmpeg$/, "ffplay")
      : path.join(path.dirname(ffmpegPath), "ffplay");

    console.log(`Using ffplay path: ${ffplayPath}`);

    // --- Helper to execute playback command and manage state ---
    const playCommand = (cmd: string, isConversionStep = false): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        // --- Re-check and stop if another process started somehow ---
        if (isAudioPlaying && currentAudioProcess && currentAudioProcess.pid && currentPlayingItemId !== itemId) {
          console.warn(
            `Race condition? Another process (item: ${currentPlayingItemId}) was active. Stopping it before starting ${itemId}.`,
          );
          try {
            currentAudioProcess.kill("SIGTERM");
          } catch (killError) {
            console.error("Error stopping previous audio process during race condition check:", killError);
          }
          // Assume killed, reset state before starting new process
          isAudioPlaying = false;
          currentAudioProcess = null;
          currentPlayingItemId = null;
        }

        // --- Set state for the new process ---
        isAudioPlaying = true;
        currentPlayingItemId = itemId;
        console.log(`Executing (item: ${itemId}): ${cmd}`);
        const process = exec(cmd);
        currentAudioProcess = process; // Store the new process

        // --- Process Event Handlers ---
        const handleClose = async (code: number | null, signal: NodeJS.Signals | null) => {
          console.log(
            `Audio process (item: ${itemId}, pid: ${process.pid}) exited with code ${code}, signal ${signal}`,
          );

          // --- State Reset Logic ---
          // Only reset state if this is the process we are currently tracking
          if (currentAudioProcess === process) {
            isAudioPlaying = false;
            currentAudioProcess = null;
            currentPlayingItemId = null;
            console.log(`Global state reset by process ${process.pid}`);
          } else {
            console.log(
              `Closed event received for a stale process (expected: ${currentAudioProcess?.pid}, got: ${process.pid}). Ignoring state reset.`,
            );
            // If the process finished but wasn't the *current* one, it means it was likely killed previously.
            // We don't resolve or reject here for stale processes.
            return;
          }

          // --- Outcome Handling ---
          if (signal === "SIGTERM" || signal === "SIGKILL") {
            console.log(`Process (item: ${itemId}) was killed intentionally.`);
            resolve(false); // Indicate stopped, not played fully
          } else if (code === 0) {
            console.log(`Process (item: ${itemId}) completed successfully.`);
            if (!isConversionStep) {
              // Find the item in the latest history to mark as played
              const history = await readHistoryFromStorage();
              const itemToMark = history.find((h) => h.id === itemId);
              if (itemToMark) {
                await markAudioAsPlayed(itemToMark); // Call the mark function
              } else {
                console.log(`Item ${itemId} not found in history to mark as played.`);
              }
            }
            resolve(true); // Indicate played successfully
          } else {
            console.error(`Process (item: ${itemId}) failed with code ${code}.`);
            reject(new Error(`Process exited with code ${code}`));
          }
        };

        const handleError = (err: Error) => {
          console.error(`Error executing audio process (item: ${itemId}, pid: ${process.pid}):`, err);
          // Only reset state if this error belongs to the currently tracked process
          if (currentAudioProcess === process) {
            isAudioPlaying = false;
            currentAudioProcess = null;
            currentPlayingItemId = null;
            console.log(`Global state reset due to error in process ${process.pid}`);
          } else {
            console.log(
              `Error event received for a stale process (expected: ${currentAudioProcess?.pid}, got: ${process.pid}). Ignoring state reset.`,
            );
          }
          reject(err); // Reject the promise
        };

        process.on("close", handleClose);
        process.on("error", handleError);

        process.stderr?.on("data", (data) =>
          console.error(`stderr (item: ${itemId}, pid: ${process.pid}): ${data.toString()}`),
        );
        // process.stdout?.on('data', (data) => console.log(`stdout (item: ${itemId}): ${data}`));
      });
    };

    // --- Playback Attempts ---
    let playedSuccessfully = false;
    let stoppedIntentionally = false;

    // 1. Try ffplay directly
    try {
      console.log(`Attempting direct play (item: ${itemId})...`);
      playedSuccessfully = await playCommand(`${ffplayPath} -nodisp -autoexit "${url}"`);
      if (playedSuccessfully) {
        await showToast({ style: Toast.Style.Success, title: "Playback Finished" });
        return; // Success, exit function
      } else {
        console.log(`Direct play (item: ${itemId}) was stopped.`);
        stoppedIntentionally = true; // Assume stopped if playCommand resolved false
        // If stopped, playAudioFromUrl should just return. State is already reset by playCommand.
        return;
      }
    } catch (ffplayError: unknown) {
      console.log(`Direct ffplay (item: ${itemId}) failed, falling back to download...`, ffplayError);
      // If it failed (not stopped), proceed to fallback
    }

    // 2. Fallback: Download and play local
    const tmpDir = os.tmpdir();
    const fileName = `notis-audio-${Date.now()}-${itemId}.ogg`;
    const filePath = path.join(tmpDir, fileName);

    try {
      console.log(`Downloading audio for item ${itemId} to ${filePath}...`);
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
      const buffer = await response.arrayBuffer(); // Use arrayBuffer
      await fs.writeFile(filePath, Buffer.from(buffer)); // Convert to Buffer for writeFile
      console.log(`Audio (item: ${itemId}) saved to: ${filePath}`);

      // 3. Try ffplay local
      try {
        console.log(`Attempting local play (item: ${itemId})...`);
        playedSuccessfully = await playCommand(`${ffplayPath} -nodisp -autoexit "${filePath}"`);
        if (playedSuccessfully) {
          await showToast({ style: Toast.Style.Success, title: "Playback Finished" });
          // Clean up successful local play temp file
          await fs
            .unlink(filePath)
            .catch((err) => console.error("Error deleting temp file after successful local play:", err));
          return; // Success
        } else {
          console.log(`Local play (item: ${itemId}) was stopped.`);
          stoppedIntentionally = true;
          // Clean up and return if stopped
          await fs
            .unlink(filePath)
            .catch((err) => console.error("Error deleting temp file after stopped local play:", err));
          return;
        }
      } catch (localFfplayError: unknown) {
        console.log(`Local ffplay (item: ${itemId}) failed, converting...`, localFfplayError);
        // If failed (not stopped), proceed to conversion
      }

      // 4. Convert to m4a and play with afplay
      const m4aPath = filePath.replace(".ogg", ".m4a");
      try {
        console.log(`Converting (item: ${itemId}) ${filePath} to ${m4aPath}...`);
        // Use execPromise for conversion as we don't need to kill it specifically
        await execPromise(`${ffmpegPath} -i "${filePath}" -c:a aac "${m4aPath}"`);
        console.log(`Converted (item: ${itemId}) to: ${m4aPath}`);

        // 5. Try afplay
        console.log(`Attempting afplay (item: ${itemId})...`);
        playedSuccessfully = await playCommand(`afplay "${m4aPath}"`);
        if (playedSuccessfully) {
          await showToast({ style: Toast.Style.Success, title: "Playback Finished" });
          // Success
        } else {
          console.log(`afplay (item: ${itemId}) was stopped.`);
          stoppedIntentionally = true;
          // If stopped, return. Cleanup happens in finally.
          return;
        }
      } catch (afplayError: unknown) {
        console.error(`afplay (item: ${itemId}) failed:`, afplayError);
        throw afplayError; // Re-throw final playback error
      } finally {
        // Clean up converted file if it exists, unless stopped intentionally before afplay finished
        if (!stoppedIntentionally || currentPlayingItemId !== itemId) {
          await fs.unlink(m4aPath).catch((err) => console.error("Error deleting converted file:", err));
        } else if (stoppedIntentionally) {
          console.log("Skipping m4a cleanup as afplay was stopped intentionally.");
        }
      }
    } finally {
      // Clean up original downloaded file if it exists, unless stopped intentionally
      if (!stoppedIntentionally || currentPlayingItemId !== itemId) {
        await fs.unlink(filePath).catch((err) => console.error("Error deleting temporary ogg file:", err));
      } else if (stoppedIntentionally) {
        console.log("Skipping ogg cleanup as playback was stopped intentionally.");
      }
    }
  } catch (error) {
    console.error(`Error playing audio (item: ${itemId}):`, error);
    // Ensure state is reset only if the error pertains to the current item
    if (currentPlayingItemId === itemId) {
      isAudioPlaying = false;
      currentAudioProcess = null;
      currentPlayingItemId = null;
      console.log(`Global state reset due to error for item ${itemId}`);
    }
    showFailureToast("Error Playing Audio", { message: "Failed to play audio. Check logs for details." });
  } finally {
    // Final safety check: if this item ID was supposed to be playing but isn't marked as playing, clear state.
    // This covers edge cases where state might not have been reset properly.
    if (currentPlayingItemId === itemId && !isAudioPlaying && currentAudioProcess === null) {
      console.log(`Final state cleanup check for item ${itemId}. State seems consistent.`);
    } else if (currentPlayingItemId === itemId && (isAudioPlaying || currentAudioProcess !== null)) {
      console.warn(`Final state cleanup check for item ${itemId}: State inconsistent! Forcing reset.`);
      isAudioPlaying = false;
      currentAudioProcess = null;
      currentPlayingItemId = null;
    }
  }
};

// Play audio for an item, passing the item ID
const playItemAudio = async (item: CommandHistoryItem): Promise<void> => {
  console.log(`Request to play audio for item: ${item.id}`);
  // console.log(`Media URLs: ${JSON.stringify(item.mediaUrls)}`); // Reduce verbosity

  if (item.status !== "success" && item.status !== "read") {
    console.log(`Skipping playback for item ${item.id} due to status: ${item.status}`);
    showFailureToast("Cannot Play Audio", { message: "Audio can only be played for successful messages." });
    return;
  }

  if (!item.mediaUrls || item.mediaUrls.length === 0) {
    console.log(`No media URLs found for item ${item.id}.`);
    showFailureToast("No Audio Found", { message: "This item does not contain any media." });
    return;
  }

  const audioUrl = item.mediaUrls.find((url) => isAudioFile(url));
  if (!audioUrl) {
    console.log(`No OGG audio file found in mediaUrls for item ${item.id}.`);
    showFailureToast("No Audio Found", { message: "Could not find a playable OGG audio file in the media URLs." });
    return;
  }

  console.log(`Found audio URL to play for item ${item.id}: ${audioUrl}`);

  // Pass item.id to playAudioFromUrl
  // No try/catch needed here as playAudioFromUrl handles its own errors/toasts.
  await playAudioFromUrl(audioUrl, item.id);

  // No need to mark as played here; playAudioFromUrl handles it internally on success.
  console.log(`playItemAudio finished for item ${item.id}.`);
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
                    <>
                      <Action
                        title="Play Audio"
                        icon={Icon.Play}
                        shortcut={{ modifiers: ["opt"], key: "p" }}
                        onAction={() => playItemAudio(item)}
                      />
                    </>
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
