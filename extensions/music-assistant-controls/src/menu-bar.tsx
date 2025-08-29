import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { PlayerQueue } from "./external-code/interfaces";
import MusicAssistantClient from "./music-assistant-client";
import { useEffect, useState } from "react";
import { selectedPlayerKey, StoredQueue } from "./use-selected-player-id";

export default function Command() {
  const client = new MusicAssistantClient();
  const {
    isLoading,
    data: queues,
    revalidate: revalidatePlayers,
  } = useCachedPromise(async () => await client.getActiveQueues(), [], {
    keepPreviousData: true,
    initialData: [],
  });

  const { value: storedQueueId, setValue: storeQueueId } = useLocalStorage<StoredQueue>(selectedPlayerKey);

  const [title, setTitle] = useState<string>();

  useEffect(() => {
    const activeQueue = client.findActiveQueue(queues, storedQueueId);
    const newTitle = client.getDisplayTitle(activeQueue);

    if (client.shouldUpdateTitle(title, newTitle)) {
      setTitle(newTitle);
    }
  }, [storedQueueId, queues]);

  const selectPlayerForMenuBar = (queue: PlayerQueue) => {
    const selection = client.createQueueSelection(queue);

    if (selection.title) {
      setTitle(selection.title);
    }

    if (storedQueueId?.queue_id !== selection.queueId) {
      storeQueueId({ queue_id: selection.queueId });
    }
  };

  return (
    <MenuBarExtra icon="transparent-logo.png" isLoading={isLoading} title={title}>
      {queues &&
        queues.map((queue) => (
          <MenuBarExtra.Section title={queue.display_name} key={queue.queue_id}>
            <MenuBarExtra.Item
              icon={Icon.Eye}
              title={queue.current_item?.name || ""}
              onAction={() => selectPlayerForMenuBar(queue)}
            ></MenuBarExtra.Item>
            <MenuBarExtra.Item
              title="Next"
              icon={Icon.ArrowRight}
              onAction={() => client.next(queue.queue_id)}
            ></MenuBarExtra.Item>
            <MenuBarExtra.Item
              title={client.getPlayPauseButtonText(queue.state)}
              icon={client.isPlaying(queue.state) ? Icon.Pause : Icon.Play}
              onAction={() => client.togglePlayPause(queue.queue_id)}
            ></MenuBarExtra.Item>
          </MenuBarExtra.Section>
        ))}
      {queues ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.RotateAntiClockwise}
            onAction={revalidatePlayers}
          ></MenuBarExtra.Item>
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item
          title="Fix configuration"
          icon={Icon.WrenchScrewdriver}
          onAction={openExtensionPreferences}
        ></MenuBarExtra.Item>
      )}
    </MenuBarExtra>
  );
}
