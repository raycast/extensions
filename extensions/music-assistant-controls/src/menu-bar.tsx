import { Icon, MenuBarExtra, openExtensionPreferences } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { PlayerQueue, Player } from "./external-code/interfaces";
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

  const handleVolumeChange = async (playerId: string, volume: number) => {
    try {
      await client.setVolume(playerId, volume);
      // Revalidate player data to get updated volume
      revalidatePlayerDetails();
    } catch (error) {
      console.error("Failed to set volume:", error);
    }
  };

  const getPlayerById = (playerId: string): Player | undefined => {
    return players.find((p) => p.player_id === playerId);
  };

  return (
    <MenuBarExtra icon="transparent-logo.png" isLoading={isLoading} title={title}>
      {queues &&
        queues.map((queue) => {
          const player = getPlayerById(queue.queue_id);
          return (
            <MenuBarExtra.Section title={queue.display_name} key={queue.queue_id}>
              <MenuBarExtra.Item
                icon={Icon.Eye}
                title={queue.current_item?.name || ""}
                onAction={() => selectPlayerForMenuBar(queue)}
              />
              <MenuBarExtra.Item title="Next" icon={Icon.ArrowRight} onAction={() => client.next(queue.queue_id)} />
              <MenuBarExtra.Item
                title={client.getPlayPauseButtonText(queue.state)}
                icon={client.isPlaying(queue.state) ? Icon.Pause : Icon.Play}
                onAction={() => client.togglePlayPause(queue.queue_id)}
              />

              {/* Volume Controls */}
              {client.supportsVolumeControl(player) && (
                <>
                  <MenuBarExtra.Item
                    title={client.getVolumeDisplay(player)}
                    icon={player?.volume_muted ? Icon.SpeakerOff : Icon.SpeakerOn}
                  />
                  <MenuBarExtra.Submenu title="Set Volume" icon={Icon.SpeakerHigh}>
                    {client.getVolumeOptions().map((option) => (
                      <MenuBarExtra.Item
                        key={option.level}
                        title={option.display}
                        icon={player?.volume_level === option.level ? Icon.CheckCircle : undefined}
                        onAction={() => handleVolumeChange(queue.queue_id, option.level)}
                      />
                    ))}
                  </MenuBarExtra.Submenu>
                </>
              )}
            </MenuBarExtra.Section>
          );
        })}
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
