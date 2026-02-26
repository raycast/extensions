import { showFailureToast } from "@raycast/utils";
import { showToast, Toast, Form, ActionPanel, Action, useNavigation } from "@raycast/api";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";
import { useState } from "react";
import { isValidVolumeInput } from "./set-volume/volume-validation";

interface VolumeFormValues {
  volume: string;
}

function VolumeForm({ onSubmit }: { onSubmit: (volume: number) => void }) {
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
        defaultValue="50"
        error={volumeError}
        onChange={() => setVolumeError(undefined)}
      />
    </Form>
  );
}

export default function SetVolumeCommand() {
  async function handleVolumeSubmit(volume: number) {
    const selectedPlayerID = await getSelectedQueueID();
    if (!selectedPlayerID) return;
    try {
      await new MusicAssistantClient().setVolume(selectedPlayerID, volume);
      await showToast({ style: Toast.Style.Success, title: `Volume set to ${volume}` });
    } catch (error) {
      showFailureToast(error, {
        title: "💥 Something went wrong!",
      });
    }
  }

  return <VolumeForm onSubmit={handleVolumeSubmit} />;
}
