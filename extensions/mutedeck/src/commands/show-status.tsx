import { showToast, Toast, updateCommandMetadata } from '@raycast/api';
import { useEffect } from 'react';
import {
  getStatus,
  isInMeeting,
  isMuted,
  isMuteDeckRunning,
  isVideoOn,
  type MuteDeckStatus,
} from '../utils/api';

export default function Command(): void {
  async function fetchStatus(): Promise<void> {
    try {
      const status = await getStatus();
      await updateCommandMetadata({ subtitle: getStatusText(status) });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: 'Failed to Get Status',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  function getStatusText(status: MuteDeckStatus): string {
    if (!isMuteDeckRunning(status)) {
      return 'Not Running';
    }

    if (!isInMeeting(status)) {
      return 'Not in Meeting';
    }

    const muted = isMuted(status) ? 'Muted' : 'Unmuted';
    const video = isVideoOn(status) ? 'Video On' : 'Video Off';
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
