import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { PlayerQueue, Player } from "./external-code/interfaces";
import MusicAssistantClient from "./music-assistant-client";
import { useEffect, useState, useMemo } from "react";
import { selectedPlayerKey, StoredQueue } from "./use-selected-player-id";

export default function Command() {
  const client = useMemo(() => new MusicAssistantClient(), []);
  const {
    isLoading,
    data: queues,
    revalidate: revalidatePlayers,
  } = useCachedPromise(async () => await client.getActiveQueues(), [], {
    keepPreviousData: true,
    initialData: [],
  });

  const { data: players, revalidate: revalidatePlayerDetails } = useCachedPromise(
    async () => await client.getPlayers(),
    [],
    {
      keepPreviousData: true,
      initialData: [],
    },
  );

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

  const getPlayerById = (playerId: string): Player | undefined => {
    return players.find((p) => p.player_id === playerId);
  };

  const activeQueue = client.findActiveQueue(queues, storedQueueId);
  const inactiveQueues = (queues || []).filter((q) => q.queue_id !== activeQueue?.queue_id);

  return (
    <MenuBarExtra icon="transparent-logo.png" isLoading={isLoading} title={title}>
      {/* Active Player Section - Always First */}
      {activeQueue && (
        <MenuBarExtra.Section title={activeQueue.display_name}>
          <MenuBarExtra.Item
            icon={Icon.Eye}
            title={activeQueue.current_item?.name || ""}
            onAction={() => selectPlayerForMenuBar(activeQueue)}
          />
          <MenuBarExtra.Item title="Next" icon={Icon.ArrowRight} onAction={() => client.next(activeQueue.queue_id)} />
          <MenuBarExtra.Item
            title={client.getPlayPauseButtonText(activeQueue.state)}
            icon={client.isPlaying(activeQueue.state) ? Icon.Pause : Icon.Play}
            onAction={() => client.togglePlayPause(activeQueue.queue_id)}
          />

          {/* Volume Controls */}
          {client.supportsVolumeControl(getPlayerById(activeQueue.queue_id)) && (
            <>
              <MenuBarExtra.Item
                title={client.getVolumeDisplay(getPlayerById(activeQueue.queue_id))}
                icon={getPlayerById(activeQueue.queue_id)?.volume_muted ? Icon.SpeakerOff : Icon.SpeakerOn}
              />
              <MenuBarExtra.Submenu title="Set Volume" icon={Icon.SpeakerHigh}>
                {client.getVolumeOptions().map((option) => (
                  <MenuBarExtra.Item
                    key={option.level}
                    title={option.display}
                    icon={
                      getPlayerById(activeQueue.queue_id)?.volume_level === option.level ? Icon.CheckCircle : undefined
                    }
                    onAction={async () => {
                      await client.setVolume(activeQueue.queue_id, option.level);
                      revalidatePlayerDetails();
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            </>
          )}
        </MenuBarExtra.Section>
      )}

      {/* Other Players - Single Line Per Player */}
      {inactiveQueues.length > 0 && (
        <MenuBarExtra.Section>
          {inactiveQueues.map((queue) => (
            <MenuBarExtra.Item
              key={queue.queue_id}
              title={queue.display_name}
              onAction={() => selectPlayerForMenuBar(queue)}
            />
          ))}
        </MenuBarExtra.Section>
      )}

      {/* Refresh */}
      {queues && queues.length > 0 ? (
        <MenuBarExtra.Section>
          <MenuBarExtra.Item
            title="Refresh"
            icon={Icon.RotateAntiClockwise}
            onAction={() => {
              revalidatePlayers();
              revalidatePlayerDetails();
            }}
          />
        </MenuBarExtra.Section>
      ) : (
        <MenuBarExtra.Item
          title="Fix configuration"
          icon={Icon.WrenchScrewdriver}
          onAction={openExtensionPreferences}
        />
      )}
    </MenuBarExtra>
  );
}
