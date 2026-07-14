import { usePromise, useForm } from "@raycast/utils";
import { Form, ActionPanel, Action, popToRoot } from "@raycast/api";
import { useEffect } from "react";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";

export default function SetVolumeCommand() {
  const { data, isLoading } = usePromise(async () => {
    const selectedPlayerID = await getSelectedQueueID();
    if (!selectedPlayerID) return { controller: null, volume: 50 };

    const client = new MusicAssistantClient();
    const controller = await client.createVolumeController(selectedPlayerID);
    const volume = await controller.getVolume();
    return { controller, volume };
  });

  const { controller, volume: currentVolume } = data ?? { controller: null, volume: 50 };

  const { handleSubmit, itemProps, setValue } = useForm<{ volume: string }>({
    async onSubmit(values) {
      await controller!.setVolume(Number(values.volume));
      popToRoot();
    },
    initialValues: {
      volume: String(currentVolume ?? 50),
    },
    validation: {
      volume: (value) => {
        const num = Number(value);
        if (!value || isNaN(num)) return "Enter a number";
        if (num < 0 || num > 100) return "Enter a number between 0 and 100";
      },
    },
  });

  useEffect(() => {
    setValue("volume", String(currentVolume));
  }, [currentVolume, setValue]);

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Set Volume" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField title="Volume" placeholder="0-100" {...itemProps.volume} />
    </Form>
  );
}
