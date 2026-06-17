import {
  MenuBarExtra,
  Icon,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  LocalStorage,
  environment,
  showHUD,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { exec } from "child_process";
import { promisify } from "util";
import { showFailureToast } from "@raycast/utils";
import path from "path";

const execPromise = promisify(exec);

// Types
interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  status: "queued" | "success" | "failed" | "read";
  id: string;
  mediaUrls?: string[];
  mediaType?: string;
}

interface NotisApiResult {
  success: boolean;
  response: string | null;
  error: string | null;
  mediaUrls?: string[];
  mediaType?: string;
}

interface Preferences {
  apiKey: string;
  autoPlayAudio?: boolean;
  ffmpegPath?: string;
}

// Constants
const DEV_API_ENDPOINT = "http://0.0.0.0:3000/submit";
const PROD_API_ENDPOINT = "https://api.notis.ai/submit";

// Determine which API endpoint to use based on Raycast's environment
const getApiEndpoint = (): string => {
  if (environment.isDevelopment) {
    console.log("Running in dev mode");
    return DEV_API_ENDPOINT;
  }
  console.log("Running in production mode");
  return PROD_API_ENDPOINT;
};

const API_ENDPOINT = getApiEndpoint();

// Keep track of requests currently being processed to prevent duplicates
const requestsBeingProcessed = new Set<string>();

// Utils
const generateMessageId = (): string => `TG${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;

// Custom hook for history data management
const useHistoryData = () => {
  // Get history data from LocalStorage
  const getHistory = async (): Promise<CommandHistoryItem[]> => {
    const historyJson = await LocalStorage.getItem<string>("commandHistory");
    if (!historyJson) return [];
    try {
      return JSON.parse(historyJson) as CommandHistoryItem[];
    } catch (error) {
      console.error("Error parsing history:", error);
      return [];
    }
  };

  // Get all pending requests
  const getAllPendingRequests = async (): Promise<CommandHistoryItem[]> => {
    const history = await getHistory();
    // Sort by timestamp (ascending) to prioritize older requests
    return history.filter((item) => item.status === "queued").sort((a, b) => a.timestamp - b.timestamp);
  };

  // Update request status
  const updateRequestStatus = async (
    id: string,
    response: string,
    status: "success" | "failed" | "queued",
    mediaUrls?: string[],
    mediaType?: string,
  ): Promise<void> => {
    const history = await getHistory();
    if (history.length === 0) return;

    const updatedHistory = history.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          status,
          timestamp: Date.now(),
          // Only update response if it's a success status and response is provided
          ...(status === "success" && response.trim() ? { response } : {}),
          // Only update media properties if they're provided
          ...(mediaUrls ? { mediaUrls } : {}),
          ...(mediaType ? { mediaType } : {}),
        };
      }
      return item;
    });

    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
  };

  // Mark an item as read in the history
  const markItemAsRead = async (itemId: string): Promise<void> => {
    const history = await getHistory();
    if (history.length === 0) return;

    const updatedHistory = history.map((item) =>
      item.id === itemId && item.status === "success" ? { ...item, status: "read" as const } : item,
    );

    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
  };

  // Get audio items from history
  const getAudioItems = async (): Promise<CommandHistoryItem[]> => {
    const history = await getHistory();

    // Find any items with audio files (both played and unplayed)
    const audioItems = history.filter(
      (item) =>
        (item.status === "success" || item.status === "read") &&
        item.mediaUrls &&
        item.mediaUrls.length > 0 &&
        (!item.mediaType || item.mediaType.includes("audio") || item.mediaUrls.some((url) => isAudioFile(url))),
    );

    // Sort by timestamp descending to get the most recent first
    return audioItems.sort((a, b) => b.timestamp - a.timestamp);
  };

  // Check if any media URLs are audio files
  const hasAudioFiles = async (): Promise<boolean> => {
    const audioItems = await getAudioItems();
    return audioItems.length > 0;
  };

  // Get most recent audio response
  const getLatestAudioResponse = async (): Promise<CommandHistoryItem | null> => {
    const audioItems = await getAudioItems();
    if (audioItems.length === 0) return null;
    return audioItems[0];
  };

  // Get request counts
  const getRequestCounts = async (): Promise<{ queuedCount: number; newCompletedCount: number }> => {
    const history = await getHistory();

    // Get queued count
    const queuedCount = history.filter((item) => item.status === "queued").length;

    // Get unviewed completed count (success items that have not been changed to read yet)
    const newCompletedCount = history.filter((item) => item.status === "success").length;

    return { queuedCount, newCompletedCount };
  };

  return {
    getHistory,
    getAllPendingRequests,
    updateRequestStatus,
    markItemAsRead,
    getAudioItems,
    hasAudioFiles,
    getLatestAudioResponse,
    getRequestCounts,
  };
};

// API handling
const sendToNotisAPI = async (input: string): Promise<NotisApiResult> => {
  try {
    if (!input.trim()) {
      return { success: false, response: "Please enter a command for Notis.", error: null };
    }

    // Get API key from preferences
    const preferences = getPreferenceValues<Preferences>();
    const apiKey = preferences.apiKey;

    if (!apiKey) {
      return {
        success: false,
        response: null,
        error: "API key is missing. Please set it in the extension preferences.",
      };
    }

    const payload = {
      MessageSid: generateMessageId(),
      Body: input,
    };

    console.log(`Sending to API: ${JSON.stringify(payload)}`);

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      timeout: 750000,
    });

    const data = await response.json().catch(() => null);
    console.log(`API Response: ${JSON.stringify(data)}`);

    if (!response.ok) {
      const errorMessage = data?.error || `Failed to send data to Notis: ${response.statusText} (${response.status})`;
      throw new Error(errorMessage);
    }

    // Extract message content and check for media
    const messageContent = data?.message || "No message content";
    const mediaUrls = data?.media_urls || [];
    const mediaType = data?.media_type || null;

    return {
      success: true,
      response: messageContent,
      error: null,
      mediaUrls,
      mediaType,
    };
  } catch (error) {
    console.error("Error sending data to Notis:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return { success: false, response: null, error: errorMessage };
  }
};

// Function to check if file is an OGG audio file
const isAudioFile = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase();
  return lowercaseUrl.endsWith(".ogg");
};

// Play audio for a specific item
const playItemAudio = async (
  item: CommandHistoryItem,
  playAudio: (url: string) => Promise<void>,
  markItemAsRead: (itemId: string) => Promise<void>,
): Promise<void> => {
  if (!item.mediaUrls || item.mediaUrls.length === 0) {
    return;
  }

  const audioUrl = item.mediaUrls.find((url) => isAudioFile(url));
  if (!audioUrl) {
    return;
  }

  console.log(`Playing audio from URL: ${audioUrl}`);

  await playAudio(audioUrl);

  // Mark as read
  if (item.id) {
    await markItemAsRead(item.id);
  }
};

// Function to check if there's a new unplayed audio response and play it
const checkAndAutoPlayAudio = async (
  itemId: string,
  getHistory: () => Promise<CommandHistoryItem[]>,
  playAudio: (url: string) => Promise<void>,
  markItemAsRead: (itemId: string) => Promise<void>,
): Promise<void> => {
  const preferences = getPreferenceValues<Preferences>();

  // Only proceed if auto-play is enabled
  if (!preferences.autoPlayAudio) {
    console.log("Auto-play is disabled in preferences");
    return;
  }

  // Get the item from history
  const history = await getHistory();
  if (history.length === 0) {
    console.log("No history found");
    return;
  }

  try {
    const item = history.find((item) => item.id === itemId);

    if (!item) {
      console.log(`Item with ID ${itemId} not found in history`);
      return;
    }

    // Check if the item has audio and is not already marked as read
    if (item.status === "success" && item.mediaUrls && item.mediaUrls.some((url) => isAudioFile(url))) {
      console.log(`Found audio to play for item ${itemId}`);
      // Use playItemAudio to handle the audio playback
      await playItemAudio(item, playAudio, markItemAsRead);
    } else {
      console.log(`No audio to play for item ${itemId} or already played`);
    }
  } catch (error) {
    console.error("Error getting item from history:", error);
  }
};

let isCheckingPendingRequests = false; // Flag to prevent concurrent checking

// Process one pending request at a time
const processOnePendingRequests = async (
  historyData: ReturnType<typeof useHistoryData>,
  playAudio: (url: string) => Promise<void>,
  setPendingCount: (count: number) => void,
  setNewCompletedCount: (count: number) => void,
): Promise<boolean> => {
  const queuedRequests = await historyData.getAllPendingRequests();
  if (queuedRequests.length === 0) {
    return false;
  }

  // Get the oldest request (already sorted by timestamp in getAllPendingRequests)
  const request = queuedRequests[0];

  // Skip if already being processed
  if (requestsBeingProcessed.has(request.id)) {
    return false;
  }

  // Mark this request as being processed
  requestsBeingProcessed.add(request.id);

  try {
    const counts = await historyData.getRequestCounts();
    setPendingCount(counts.queuedCount);
    setNewCompletedCount(counts.newCompletedCount);

    const result = await sendToNotisAPI(request.command);

    if (!result.success) {
      throw new Error(result.error || "API request failed");
    }

    // Update the request status
    await historyData.updateRequestStatus(
      request.id,
      result.response || "",
      "success",
      result.mediaUrls,
      result.mediaType,
    );

    // Check and play audio after successful request processing
    try {
      await checkAndAutoPlayAudio(request.id, historyData.getHistory, playAudio, historyData.markItemAsRead);
    } catch (error) {
      console.error("Error during auto-play audio:", error);
      showFailureToast("Audio Playback Error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  } catch (error) {
    await historyData.updateRequestStatus(
      request.id,
      error instanceof Error ? error.message : "Unknown error",
      "failed",
    );
  } finally {
    // Always remove from processing set when done, regardless of success/failure
    requestsBeingProcessed.delete(request.id);
  }

  // Update UI state and check if there are more requests
  const counts = await historyData.getRequestCounts();
  setPendingCount(counts.queuedCount);
  setNewCompletedCount(counts.newCompletedCount);
  return counts.queuedCount > 0;
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [queuedCount, setPendingCount] = useState(0);
  const [newCompletedCount, setNewCompletedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Use our custom hooks
  const historyData = useHistoryData();

  // Audio playback function
  const playAudio = async (url: string): Promise<void> => {
    // If audio is already playing, wait for it to finish
    if (isPlaying) {
      console.log("Audio already playing, waiting for it to finish");
      // Wait until isPlaying becomes false
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (!isPlaying) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100); // Check every 100ms
      });
    }

    try {
      setIsPlaying(true);

      await showHUD("🔊 Playing audio...");

      // Get ffplay path from preferences or use default
      const preferences = getPreferenceValues<Preferences>();
      const ffmpegPath = preferences.ffmpegPath?.trim() || "ffmpeg";
      const ffplayPath = ffmpegPath.endsWith("ffmpeg")
        ? ffmpegPath.replace(/ffmpeg$/, "ffplay")
        : path.join(path.dirname(ffmpegPath), "ffplay");

      console.log(`Playing audio directly from URL: ${url}`);

      // Play directly from URL using ffplay
      try {
        await execPromise(`${ffplayPath} -nodisp -autoexit "${url}" -loglevel quiet`);
      } catch (ffplayError: unknown) {
        // When we intentionally stop playback (e.g. via pkill in stopAudio),
        // ffplay exits with a non‑zero status (often 123 or 143). Treat these
        // as expected and silently ignore them. Only surface *unexpected*
        // failures to the user.
        const expectedExitCodes = new Set([123, 137, 143]); // 123: signal caught, 137/143: SIGKILL/SIGTERM
        const error = ffplayError as { code?: number; killed?: boolean };
        if ((error.code !== undefined && expectedExitCodes.has(error.code)) || error.killed) {
          // Normal termination triggered by stopAudio – no action needed.
          console.debug("ffplay terminated by user action – ignoring non‑zero exit code.");
        } else {
          console.error("Error playing with ffplay:", ffplayError);
          showFailureToast("Failed to play audio", {
            message: "Make sure you have FFmpeg installed or configure a custom path in preferences.",
          });
        }
      }
    } catch (error) {
      console.error("Error in audio playback:", error);
      showFailureToast("Audio Playback Error", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsPlaying(false);
    }
  };

  // Function to stop audio playback
  const stopAudio = async (): Promise<void> => {
    try {
      // Get ffplay path from preferences
      const preferences = getPreferenceValues<Preferences>();
      const ffmpegPath = preferences.ffmpegPath?.trim() || "ffmpeg";
      const ffplayPath = ffmpegPath.endsWith("ffmpeg")
        ? ffmpegPath.replace(/ffmpeg$/, "ffplay")
        : path.join(path.dirname(ffmpegPath), "ffplay");

      await execPromise(`pkill -f ${JSON.stringify(ffplayPath)}`).catch(() => {
        console.log("No ffplay processes found to kill");
      });

      setIsPlaying(false);
      await showHUD("⏹️ Audio stopped");
    } catch (error) {
      console.error("Error stopping audio:", error);
    }
  };

  // Function to toggle play/pause of latest audio
  const togglePlayPause = async (): Promise<void> => {
    if (isPlaying) {
      await stopAudio();
    } else {
      const latestAudio = await historyData.getLatestAudioResponse();
      if (latestAudio) {
        await playItemAudio(latestAudio, playAudio, historyData.markItemAsRead);
      }
    }
  };

  const checkPendingRequests = async () => {
    // Prevent concurrent executions
    if (isCheckingPendingRequests) {
      return;
    }

    isCheckingPendingRequests = true;
    setIsLoading(true);

    try {
      setIsProcessing(true);

      // Process all pending requests
      let hasMore = true;
      while (hasMore) {
        // Process one request and check if there are more
        hasMore = await processOnePendingRequests(historyData, playAudio, setPendingCount, setNewCompletedCount);
      }
    } catch (error) {
      console.error("Error checking queued requests:", error);
      showFailureToast("Error Checking Requests", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsProcessing(false);
      setIsLoading(false);
      isCheckingPendingRequests = false;
    }
  };

  useEffect(() => {
    // Check for queued requests on load
    checkPendingRequests();

    // Set interval to check periodically
    const interval = setInterval(checkPendingRequests, 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Determine which icon to show
  const getMenuBarIcon = () => {
    if (isPlaying) {
      return Icon.Waveform;
    } else if (isProcessing) {
      return Icon.CircleProgress;
    } else if (newCompletedCount > 0) {
      return Icon.CheckCircle;
    } else {
      return Icon.Message;
    }
  };

  // Get the title text for the menu bar (shows count when there are pending requests)
  const getMenuBarTitle = (): string => {
    if (queuedCount > 1) {
      return `${queuedCount}`;
    }
    return "";
  };

  return (
    <MenuBarExtra icon={getMenuBarIcon()} isLoading={isLoading} title={getMenuBarTitle()}>
      <MenuBarExtra.Item
        title={isPlaying ? "Pause" : "Play Last Audio Response"}
        icon={isPlaying ? Icon.Pause : Icon.Play}
        onAction={togglePlayPause}
      />
      <MenuBarExtra.Item
        title="View Message History"
        icon={Icon.Clock}
        onAction={async () => {
          try {
            await launchCommand({
              name: "history",
              type: LaunchType.UserInitiated,
            });
          } catch (error) {
            showFailureToast("Failed to open message history", {
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }}
      />
    </MenuBarExtra>
  );
}
