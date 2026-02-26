import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";
import { useState, useEffect } from "react";
import { isValidVolumeInput } from "./set-volume/volume-validation";

interface VolumeFormValues {
  volume: string;
}

function VolumeForm({ onSubmit, currentVolume }: { onSubmit: (volume: number) => void; currentVolume: number }) {
  const [volumeError, setVolumeError] = useState<string | undefined>();
  const { pop } = useNavigation();

  function handleSubmit(values: VolumeFormValues) {
    if (!isValidVolumeInput(values.volume)) {
      setVolumeError("Enter a number between 0 and 100");
      return;
    }

    const volume = Number(values.volume);
    setVolumeError(undefined);
    onSubmit(volume);
    pop();
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="volume"
        title="Volume"
        placeholder="0-100"
        defaultValue={String(currentVolume)}
        error={volumeError}
        onChange={() => setVolumeError(undefined)}
      />
    </Form>
  );
}

export default function SetVolumeCommand() {
  const [currentVolume, setCurrentVolume] = useState<number>(50);

  // Fetch current volume on component mount
  useEffect(() => {
    (async () => {
      try {
        const selectedPlayerID = await getSelectedQueueID();
        if (!selectedPlayerID) {
          return;
        }

        const client = new MusicAssistantClient();
        const selectedPlayer = await client.getPlayer(selectedPlayerID);
        const useGroupVolume = client.shouldUseGroupVolume(selectedPlayer);
        const volume = useGroupVolume ? (selectedPlayer.group_volume ?? 50) : (selectedPlayer.volume_level ?? 50);
        setCurrentVolume(volume);
      } catch (error) {
        // If we can't fetch, just use 50 as default
        console.error("Failed to fetch current volume:", error);
      }
    })();
  }, []);

  async function handleVolumeSubmit(volume: number) {
    const selectedPlayerID = await getSelectedQueueID();
    if (!selectedPlayerID) return;

    try {
      const client = new MusicAssistantClient();

      // Get the selected player
      const selectedPlayer = await client.getPlayer(selectedPlayerID);

      // Check if we should use group volume (for group leaders with members)
      const useGroupVolume = client.shouldUseGroupVolume(selectedPlayer);

      // Set volume
      if (useGroupVolume) {
        await client.groupSetVolume(selectedPlayer.player_id, volume);
      } else {
        const volumeControlPlayerId = client.getVolumeControlPlayer(selectedPlayer);

        if (!volumeControlPlayerId) {
          throw new Error("Unable to determine volume control target");
        }

        await client.setVolume(volumeControlPlayerId, volume);
      }

      await showToast({ style: Toast.Style.Success, title: `Volume set to ${volume}` });
    } catch (error) {
      showFailureToast(error, {
        title: "💥 Something went wrong!",
      });
    }
  }

  return <VolumeForm onSubmit={handleVolumeSubmit} currentVolume={currentVolume} />;
}
