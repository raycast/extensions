import {
  LaunchProps,
  showHUD,
  closeMainWindow,
  LocalStorage,
  launchCommand,
  LaunchType,
  getPreferenceValues,
} from "@raycast/api";
import { useEffect, useRef } from "react";
import { showFailureToast } from "@raycast/utils";

// Types
interface Arguments {
  input: string;
}

interface CommandHistoryItem {
  command: string;
  response: string;
  timestamp: number;
  status: "pending" | "success" | "failed";
  id: string;
}

interface Preferences {
  apiKey: string;
  autoPlayAudio?: boolean;
  ffmpegPath?: string;
}

// Utility Functions
const generateMessageId = (): string => `RC${Date.now().toString(36)}${Math.random().toString(36).substring(2, 9)}`;

// Add pending request to history
const addPendingRequest = async (command: string): Promise<string> => {
  const requestId = generateMessageId();

  const newItem: CommandHistoryItem = {
    id: requestId,
    command,
    response: "Processing...",
    timestamp: Date.now(),
    status: "pending",
  };

  // Get current history
  const historyJson = await LocalStorage.getItem<string>("commandHistory");
  let history: CommandHistoryItem[] = [];

  if (historyJson) {
    try {
      history = JSON.parse(historyJson);
    } catch (error) {
      console.error("Error parsing history:", error);
    }
  }

  // Add new item and save
  const updatedHistory = [newItem, ...history].slice(0, 50);
  await LocalStorage.setItem("commandHistory", JSON.stringify(updatedHistory));

  return requestId;
};

/**
 * Command to handle sending messages
 */
export default function Command(props: LaunchProps<{ arguments: Arguments }>) {
  const input = props.arguments?.input || "";
  const hasProcessedRef = useRef(false);

  // Check for empty input immediately
  useEffect(() => {
    const checkInput = async () => {
      if (!input.trim()) {
        await showFailureToast("Please provide a message to send");
        return;
      }
    };

    checkInput();
  }, []);

  // Process input if valid
  useEffect(() => {
    const handleInput = async () => {
      if (input.trim() && !hasProcessedRef.current) {
        hasProcessedRef.current = true;
        console.log("Starting processing with input:", input);

        try {
          // Validate API key before proceeding
          const preferences = getPreferenceValues<Preferences>();
          if (!preferences.apiKey || preferences.apiKey.trim() === "") {
            await showFailureToast("API Key Missing", {
              message: "Please set your Notis API key in the extension preferences",
            });
            return;
          }

          // Store the request as pending
          console.log("Adding request to pending queue:", input);
          await addPendingRequest(input);

          // First try to launch the menu-bar command to process the request
          try {
            await launchCommand({
              name: "menu-bar-command",
              type: LaunchType.Background,
            });

            // Close the main window after successful launch
            await showHUD("📤 Message sent to Notis");
            await closeMainWindow({ clearRootSearch: true });
          } catch (error) {
            console.error("Error launching menu-bar command:", error);
            // Handle the case where menu-bar-command is not initialized
            await showFailureToast("Menu bar not initialized", {
              message: "Please open the Notis Menu Bar command first",
            });
          }
        } catch (error) {
          console.error("Error processing input:", error);
          showFailureToast("Error Processing Message", {
            message: "There was an error processing your message. Please try again.",
          });
        }
      }
    };

    handleInput();
  }, []);

  return null;
}
