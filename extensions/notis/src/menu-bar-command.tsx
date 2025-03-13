import {
  MenuBarExtra,
  Icon,
  launchCommand,
  LaunchType,
  getPreferenceValues,
  LocalStorage,
  environment,
} from "@raycast/api";
import { useState, useEffect } from "react";
import fetch from "node-fetch";
import { exec } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { showFailureToast } from "@raycast/utils";

const execPromise = promisify(exec);

// Types
interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  status: "pending" | "success" | "failed" | "read";
  id: string;
  mediaUrls?: string[]; // Updated to array of URLs
  mediaType?: string;
  attempts?: number; // Track number of attempts
}

interface NotisApiResult {
  success: boolean;
  response: string | null;
  error: string | null;
  mediaUrls?: string[]; // Array of media URLs
  mediaType?: string;
}

interface Preferences {
  apiKey: string;
  autoPlayAudio?: boolean; // Add preference for auto-playing audio
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

  console.log("Running in full development mode, using development API endpoint");
  return PROD_API_ENDPOINT;
};

const API_ENDPOINT = getApiEndpoint();
const TIMEOUT_MS = 750 * 1000; // 750 seconds in milliseconds

// Keep track of requests currently being processed to prevent duplicates
const requestsBeingProcessed = new Set<string>();

// Utils
const generateMessageId = (): string => `TG${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

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

// Direct LocalStorage operations
const getAllPendingRequests = async (): Promise<CommandHistoryItem[]> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return [];

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];
    // Sort by timestamp (ascending) to prioritize older requests
    // Only include items that are still in pending status and haven't exceeded max attempts
    return history
      .filter((item) => item.status === "pending" && (!item.attempts || item.attempts < 2))
      .sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error parsing history:", error);
    return [];
  }
};

const updateRequestStatus = async (
  id: string,
  response: string,
  status: "success" | "failed" | "pending",
  mediaUrls?: string[],
  mediaType?: string,
): Promise<void> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return;

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];
    const updatedHistory = history.map((item) => {
      if (item.id === id) {
        const attempts = (item.attempts || 0) + 1;
        return {
          ...item,
          response,
          status,
          timestamp: Date.now(),
          mediaUrls,
          mediaType,
          attempts, // Increment attempts counter
        };
      }
      return item;
    });

    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Error updating history:", error);
  }
};

// Mark audio as played
const markAudioAsPlayed = async (timestamp: number, itemId: string): Promise<void> => {
  await LocalStorage.setItem("lastAudioPlayedTimestamp", timestamp.toString());

  // Also store the ID of the last played item to prevent duplicate plays
  await LocalStorage.setItem("lastPlayedAudioId", itemId);

  // Mark the item as read in the history
  await markItemAsRead(itemId);
};

// Mark an item as read in the history
const markItemAsRead = async (itemId: string): Promise<void> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return;

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];
    const updatedHistory = history.map((item) =>
      item.id === itemId && item.status === "success" ? { ...item, status: "read" as const } : item,
    );

    await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));
  } catch (error) {
    console.error("Error updating read status:", error);
  }
};

// Function to check if file is an OGG audio file
const isAudioFile = (url: string): boolean => {
  const lowercaseUrl = url.toLowerCase();
  return lowercaseUrl.endsWith(".ogg");
};

// Function to download and play OGG audio
const downloadAndPlayAudio = async (url: string): Promise<void> => {
  const tempDir = path.join(os.tmpdir(), "notis-audio");
  const tempFile = path.join(tempDir, `audio-${Date.now()}.mp3`);

  try {
    // Create temp directory if it doesn't exist
    await fs.mkdir(tempDir, { recursive: true });

    // Download the file
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download audio: ${response.statusText}`);
    }

    const buffer = await response.buffer();
    await fs.writeFile(tempFile, buffer);

    // Get ffplay path from preferences or use default
    const preferences = getPreferenceValues<Preferences>();
    const ffmpegPath = preferences.ffmpegPath || "ffmpeg";
    const ffplayPath = ffmpegPath.replace("ffmpeg", "ffplay");

    // Try to play with ffplay first (better experience)
    try {
      await execPromise(`${ffplayPath} -nodisp -autoexit "${tempFile}" -loglevel quiet`);
    } catch (ffplayError) {
      console.error("Error playing with ffplay:", ffplayError);

      // Fall back to afplay if ffplay fails
      try {
        await execPromise(`afplay "${tempFile}"`);
      } catch (ffmpegError) {
        console.error("Error playing with afplay:", ffmpegError);
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
  }
};

// Check if any media URLs are OGG audio files
const hasAudioFiles = async (): Promise<boolean> => {
  const latestAudio = await getLatestAudioResponse();
  if (!latestAudio?.mediaUrls || latestAudio.mediaUrls.length === 0) {
    return false;
  }
  return latestAudio.mediaUrls.some((url) => isAudioFile(url));
};

// Get most recent audio response
const getLatestAudioResponse = async (): Promise<CommandHistoryItem | null> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return null;

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];

    // Find the most recent success item with OGG media URLs
    const audioResponses = history.filter(
      (item) =>
        (item.status === "success" || item.status === "read") &&
        item.mediaUrls &&
        item.mediaUrls.length > 0 &&
        // Check if mediaType includes audio or if URLs have OGG extension
        (!item.mediaType || item.mediaType.includes("audio") || item.mediaUrls.some((url) => isAudioFile(url))),
    );

    if (audioResponses.length === 0) return null;

    // Sort by timestamp descending to get the most recent
    return audioResponses.sort((a, b) => b.timestamp - a.timestamp)[0];
  } catch (error) {
    console.error("Error parsing history:", error);
    return null;
  }
};

// Get most recent unplayed audio response
const getLatestUnplayedAudioResponse = async (): Promise<CommandHistoryItem | null> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return null;

  // Get the last played timestamp and ID
  const lastPlayedTimestamp = (await LocalStorage.getItem<string>("lastAudioPlayedTimestamp")) || "0";
  const lastPlayedTime = parseInt(lastPlayedTimestamp);
  const lastPlayedId = (await LocalStorage.getItem<string>("lastPlayedAudioId")) || "";

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];

    // Find the most recent success item with OGG media URLs that was received after the last played time
    // and doesn't match the last played ID
    const audioResponses = history.filter(
      (item) =>
        item.status === "success" &&
        item.mediaUrls &&
        item.mediaUrls.length > 0 &&
        // Either newer than last played OR different ID to prevent duplicates
        item.timestamp > lastPlayedTime &&
        item.id !== lastPlayedId &&
        // Check if mediaType includes audio or if URLs have OGG extension
        (!item.mediaType || item.mediaType.includes("audio") || item.mediaUrls.some((url) => isAudioFile(url))),
    );

    if (audioResponses.length === 0) return null;

    // Sort by timestamp descending to get the most recent
    return audioResponses.sort((a, b) => b.timestamp - a.timestamp)[0];
  } catch (error) {
    console.error("Error parsing history:", error);
    return null;
  }
};

// Play audio for a specific item
const playItemAudio = async (item: CommandHistoryItem): Promise<void> => {
  if (!item.mediaUrls || item.mediaUrls.length === 0) {
    console.log("No audio files to play");
    return;
  }

  // Find the first audio file
  const audioUrl = item.mediaUrls.find((url) => isAudioFile(url));
  if (!audioUrl) {
    console.log("No OGG audio files found");
    return;
  }

  // Play the audio file
  await downloadAndPlayAudio(audioUrl);

  // Mark as played
  if (item.timestamp && item.id) {
    await markAudioAsPlayed(item.timestamp, item.id);
  }
};

// Function to play audio
const playLatestAudio = async () => {
  const latestAudio = await getLatestAudioResponse();
  if (latestAudio) {
    await playItemAudio(latestAudio);
  }
};

// Function to check if there's a new unplayed audio response
const checkAndAutoPlayAudio = async (): Promise<boolean> => {
  const preferences = getPreferenceValues<Preferences>();

  // Only proceed if auto-play is enabled
  if (!preferences.autoPlayAudio) {
    return false;
  }

  const unplayedAudio = await getLatestUnplayedAudioResponse();
  if (unplayedAudio?.mediaUrls && unplayedAudio.mediaUrls.length > 0 && unplayedAudio.id) {
    console.log(`Auto-playing new audio response (ID: ${unplayedAudio.id})`);
    await downloadAndPlayAudio(unplayedAudio.mediaUrls[0]);

    // Mark as played
    if (unplayedAudio.timestamp) {
      await markAudioAsPlayed(unplayedAudio.timestamp, unplayedAudio.id);
    }
    return true;
  }
  return false;
};

// Add a debounce mechanism to prevent multiple rapid plays
let lastAutoPlayTime = 0;
const AUTO_PLAY_DEBOUNCE_MS = 5000; // 5 second debounce
let isCheckingPendingRequests = false; // Flag to prevent concurrent checking

// A wrapper for checkAndAutoPlayAudio with debounce
const debouncedAutoPlayAudio = async (): Promise<boolean> => {
  const now = Date.now();
  if (now - lastAutoPlayTime < AUTO_PLAY_DEBOUNCE_MS) {
    console.log("Auto-play debounced, skipping");
    return false;
  }

  const didPlay = await checkAndAutoPlayAudio();
  if (didPlay) {
    lastAutoPlayTime = now;
  }
  return didPlay;
};

// Process multiple pending requests in parallel
const processAllPendingRequests = async (): Promise<number> => {
  const pendingRequests = await getAllPendingRequests();
  if (pendingRequests.length === 0) {
    return 0;
  }

  console.log(`Processing ${pendingRequests.length} pending requests in parallel`);

  // Filter out requests that are already being processed
  const requestsToProcess = pendingRequests.filter((request) => !requestsBeingProcessed.has(request.id));

  if (requestsToProcess.length === 0) {
    console.log("All pending requests are already being processed");
    return 0;
  }

  console.log(`Processing ${requestsToProcess.length} new requests`);

  // Process each request concurrently
  const processingPromises = requestsToProcess.map(async (request) => {
    // Mark this request as being processed
    requestsBeingProcessed.add(request.id);

    try {
      console.log(`Processing request: ${request.id} (attempt: ${(request.attempts || 0) + 1})`);
      const result = await sendToNotisAPI(request.command);

      if (result.success) {
        console.log(`Request ${request.id} processed successfully`);
        await updateRequestStatus(request.id, result.response || "", "success", result.mediaUrls, result.mediaType);
      } else {
        console.error(`Processing error for request ${request.id}:`, result.error);
        // If max attempts reached, mark as failed permanently
        const attempts = (request.attempts || 0) + 1;
        const finalStatus = attempts >= 3 ? "failed" : "pending";
        await updateRequestStatus(request.id, result.error || "Failed", finalStatus, undefined, undefined);

        if (finalStatus === "pending") {
          console.log(`Request ${request.id} failed but will be retried (attempt ${attempts}/3)`);
        } else {
          console.log(`Request ${request.id} failed after ${attempts} attempts, marked as failed`);
        }
      }

      return result.success;
    } catch (error) {
      console.error(`Error processing request ${request.id}:`, error);
      // Mark as failed if unexpected error occurs
      const attempts = (request.attempts || 0) + 1;
      const finalStatus = attempts >= 3 ? "failed" : "pending";
      await updateRequestStatus(request.id, error instanceof Error ? error.message : "Unknown error", finalStatus);
      return false;
    } finally {
      // Always remove from processing set when done, regardless of success/failure
      requestsBeingProcessed.delete(request.id);
    }
  });

  // Wait for all requests to complete
  const results = await Promise.all(processingPromises);
  const successCount = results.filter((success) => success).length;

  console.log(`Completed processing ${successCount}/${requestsToProcess.length} requests successfully`);

  // Check for and auto-play new audio after processing requests
  if (successCount > 0) {
    await debouncedAutoPlayAudio();
  }

  return requestsToProcess.length;
};

// Get the count of pending and unviewed completed requests
const getRequestCounts = async (): Promise<{ pendingCount: number; newCompletedCount: number }> => {
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  if (!historyJson) return { pendingCount: 0, newCompletedCount: 0 };

  try {
    const history = JSON.parse(historyJson) as CommandHistoryItem[];

    // Get pending count
    const pendingCount = history.filter((item) => item.status === "pending").length;

    // Get unviewed completed count (success items that have not been changed to read yet)
    const newCompletedCount = history.filter((item) => item.status === "success").length;

    return { pendingCount, newCompletedCount };
  } catch (error) {
    console.error("Error parsing history:", error);
    return { pendingCount: 0, newCompletedCount: 0 };
  }
};

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [newCompletedCount, setNewCompletedCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasAudioResponse, setHasAudioResponse] = useState(false);
  const [hasUnreadMedia, setHasUnreadMedia] = useState(false);

  // Check for unread media
  const checkForUnreadMedia = async () => {
    try {
      const historyJson = await LocalStorage.getItem<string>("commandHistory");
      if (!historyJson) return false;

      const history = JSON.parse(historyJson) as CommandHistoryItem[];
      const hasMedia = history.some((item) => item.status === "success" && item.mediaUrls && item.mediaUrls.length > 0);

      setHasUnreadMedia(hasMedia);
      return hasMedia;
    } catch (error) {
      console.error("Error checking for unread media:", error);
      showFailureToast("Error Checking Media", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    }
  };

  const checkPendingRequests = async () => {
    // Prevent concurrent executions
    if (isCheckingPendingRequests) {
      console.log("Already checking pending requests, skipping");
      return;
    }

    isCheckingPendingRequests = true;
    setIsLoading(true);

    try {
      // Process all pending requests in parallel
      setIsProcessing(true);
      const processedCount = await processAllPendingRequests();
      if (processedCount > 0) {
        console.log(`Processed ${processedCount} pending requests`);
      } else {
        console.log("No pending requests to process");

        // Also check for auto-play even if no new requests were processed
        // But only if we haven't played something very recently (debounce)
        await debouncedAutoPlayAudio();
      }
      setIsProcessing(false);

      // Update counts
      const counts = await getRequestCounts();
      setPendingCount(counts.pendingCount);
      setNewCompletedCount(counts.newCompletedCount);

      // Check if we have audio responses and unread media
      setHasAudioResponse(await hasAudioFiles());
      await checkForUnreadMedia();
    } catch (error) {
      console.error("Error checking pending requests:", error);
      showFailureToast("Error Checking Requests", {
        message: error instanceof Error ? error.message : "Unknown error occurred",
      });
      setIsProcessing(false);
    } finally {
      setIsLoading(false);
      isCheckingPendingRequests = false; // Always release the flag when done
    }
  };

  useEffect(() => {
    // Check for pending requests on load
    checkPendingRequests();

    // Set interval to check periodically
    const interval = setInterval(checkPendingRequests, 60 * 1000); // Check every minute

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Determine which icon to show
  const getMenuBarIcon = () => {
    if (isProcessing) {
      return Icon.CircleProgress;
    } else if (pendingCount > 0) {
      return Icon.CircleFilled;
    } else if (newCompletedCount > 0) {
      // Show different icons for unread media vs. general messages
      return hasUnreadMedia ? Icon.Play : Icon.CheckCircle;
    } else {
      return Icon.Message;
    }
  };

  return (
    <MenuBarExtra icon={getMenuBarIcon()} isLoading={isLoading} title="">
      {hasAudioResponse && (
        <MenuBarExtra.Item title="Play Last Audio Response" icon={Icon.Play} onAction={playLatestAudio} />
      )}
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
