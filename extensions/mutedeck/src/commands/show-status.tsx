import { showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import {
  getStatus,
  isInMeeting,
  isMuted,
  isMuteDeckRunning,
  isVideoOn,
  type MuteDeckStatus,
} from "../utils/api";

interface State {
  status: MuteDeckStatus | null;
  isLoading: boolean;
  error: Error | null;
}

export default function Command(): void {
  const [state, setState] = useState<State>({
    status: null,
    isLoading: true,
    error: null,
  });

  async function fetchStatus(): Promise<void> {
    try {
      const status = await getStatus();
      setState((prev) => ({ ...prev, status, isLoading: false }));

      // Update command metadata
      Command.subtitle = getStatusText(status);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error : new Error("Failed to fetch status"),
        isLoading: false,
      }));

      showToast({
        style: Toast.Style.Failure,
        title: "Failed to Get Status",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  function getStatusText(status: MuteDeckStatus): string {
    if (!isMuteDeckRunning(status)) {
      return "Not Running";
    }

    if (!isInMeeting(status)) {
      return "Not in Meeting";
    }

    const muted = isMuted(status) ? "Muted" : "Unmuted";
    const video = isVideoOn(status) ? "Video On" : "Video Off";
    return `${muted}, ${video}`;
  }

  useEffect(() => {
    void fetchStatus();
    const interval = setInterval(fetchStatus, 120000); // Update every 2 minutes
    return () => clearInterval(interval);
  }, []);
}

// Metadata for the command
Command.title = "Show Status";
Command.description = "Display current MuteDeck status";
Command.subtitle = "Loading...";
