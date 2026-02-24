import { Icon, MenuBarExtra, openExtensionPreferences, Image } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { Player, PlayerQueue } from "./external-code/interfaces";
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
    const displayQueue = client.getDisplayQueueForMenuBar(activeQueue, players, queues);

    const newTitle = client.getDisplayTitle(displayQueue);

    if (client.shouldUpdateTitle(title, newTitle)) {
      setTitle(newTitle);
    }
  }, [storedQueueId, queues, players, client, title]);

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
  const displayableQueues = client.getDisplayableQueues(queues, players);
  const activeDisplayQueue = client.getDisplayQueueForMenuBar(activeQueue, players, queues);
  const inactiveQueues = displayableQueues.filter((q) => q.queue_id !== activeDisplayQueue?.queue_id);

  return (
    <MenuBarExtra icon="transparent-logo.png" isLoading={isLoading} title={title}>
      {/* Active Player Section - Always First */}
      {activeDisplayQueue && (
        <MenuBarExtra.Section title={activeDisplayQueue.display_name}>
          <MenuBarExtra.Item
            icon={
              client.getQueueAlbumArt(activeDisplayQueue)
                ? { source: client.getQueueAlbumArt(activeDisplayQueue)!, mask: Image.Mask.RoundedRectangle }
                : Icon.Music
            }
            title={client.getQueueCurrentSong(activeDisplayQueue)}
            onAction={() => selectPlayerForMenuBar(activeDisplayQueue)}
          />
          <MenuBarExtra.Item
            title="Next"
            icon={Icon.ArrowRight}
            onAction={() => client.next(activeDisplayQueue.queue_id)}
          />
          <MenuBarExtra.Item
            title={client.getPlayPauseButtonText(activeDisplayQueue.state)}
            icon={client.isPlaying(activeDisplayQueue.state) ? Icon.Pause : Icon.Play}
            onAction={() => client.togglePlayPause(activeDisplayQueue.queue_id)}
          />

          {/* Volume Controls */}
          {client.supportsVolumeControl(getPlayerById(activeDisplayQueue.queue_id)) && (
            <>
              <MenuBarExtra.Item
                title={client.getVolumeDisplay(getPlayerById(activeDisplayQueue.queue_id))}
                icon={getPlayerById(activeDisplayQueue.queue_id)?.volume_muted ? Icon.SpeakerOff : Icon.SpeakerOn}
              />
              <MenuBarExtra.Submenu title="Set Volume" icon={Icon.SpeakerHigh}>
                {client.getVolumeOptions().map((option) => (
                  <MenuBarExtra.Item
                    key={option.level}
                    title={option.display}
                    icon={
                      getPlayerById(activeDisplayQueue.queue_id)?.volume_level === option.level
                        ? Icon.CheckCircle
                        : undefined
                    }
                    onAction={async () => {
                      await client.setVolume(activeDisplayQueue.queue_id, option.level);
                      revalidatePlayerDetails();
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            </>
          )}

          {/* Group Members & Potential Members */}
          {(() => {
            const activePlayer = getPlayerById(activeDisplayQueue.queue_id);
            if (!activePlayer || !client.canFormGroup(activePlayer)) return null;

            const currentMembers = client
              .getGroupMembers(activePlayer, players)
              .filter((m) => m.player_id !== activePlayer.player_id);

            const compatiblePlayers = client.getCompatiblePlayers(activePlayer, players);
            const potentialMembers = compatiblePlayers.filter(
              (p) => p.player_id !== activePlayer.player_id && !currentMembers.find((m) => m.player_id === p.player_id),
            );

            const hasContent = currentMembers.length > 0 || potentialMembers.length > 0;

            return hasContent ? (
              <MenuBarExtra.Submenu title="Group Members" icon={Icon.TwoPeople}>
                {/* Current Members */}
                {currentMembers.map((member) => (
                  <MenuBarExtra.Item
                    key={member.player_id}
                    title={member.display_name}
                    icon={Icon.Minus}
                    onAction={async () => {
                      await client.ungroupPlayer(member.player_id);
                      revalidatePlayerDetails();
                    }}
                  />
                ))}

                {/* Potential Members */}
                {potentialMembers.map((player) => (
                  <MenuBarExtra.Item
                    key={player.player_id}
                    title={player.display_name}
                    icon={Icon.Plus}
                    onAction={async () => {
                      await client.groupPlayer(player.player_id, activePlayer.player_id);
                      revalidatePlayerDetails();
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            ) : null;
          })()}
        </MenuBarExtra.Section>
      )}

      {/* Other Players - Single Line Per Player */}
      {inactiveQueues.length > 0 && (
        <MenuBarExtra.Section>
          {inactiveQueues.map((queue) => (
            <MenuBarExtra.Item
              key={queue.queue_id}
              icon={
                client.getQueueAlbumArt(queue)
                  ? { source: client.getQueueAlbumArt(queue)!, mask: Image.Mask.RoundedRectangle }
                  : Icon.Music
              }
              title={queue.display_name}
              subtitle={client.getQueueCurrentSong(queue)}
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
