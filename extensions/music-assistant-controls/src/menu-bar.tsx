import { Icon, MenuBarExtra, Image, LaunchType, launchCommand } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Player, PlayerQueue } from "./music-assistant/external-code/interfaces";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getStoredQueue, storeSelectedQueueID } from "./player-selection/use-selected-player-id";

export default function Command() {
  const client = new MusicAssistantClient();

  // Fetch both in parallel with automatic caching
  const {
    data: { queuesData = [], playersData = [], storedQueueId, activePlayerVolume } = {},
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      const [queuesData, playersData, storedQueueId] = await Promise.all([
        client.getActiveQueues(),
        client.getPlayers(),
        getStoredQueue(),
      ]);

      const activeQueue = client.findActiveQueue(queuesData, storedQueueId);
      const displayQueue = client.getDisplayQueueForMenuBar(activeQueue, playersData, queuesData);

      let activePlayerVolume: number | undefined = undefined;
      if (displayQueue) {
        const controller = await client.createVolumeController(displayQueue.queue_id);
        activePlayerVolume = await controller.getVolume();
      }

      return { queuesData, playersData, storedQueueId, activePlayerVolume };
    },
    [],
    {
      keepPreviousData: true,
    },
  );

  const activeQueue = client.findActiveQueue(queuesData, storedQueueId);
  const displayQueue = client.getDisplayQueueForMenuBar(activeQueue, playersData, queuesData);
  const title = client.getDisplayTitle(displayQueue);

  const selectPlayerForMenuBar = async (queue: PlayerQueue) => {
    const selection = client.createQueueSelection(queue);

    if (storedQueueId?.queue_id !== selection.queueId) {
      await storeSelectedQueueID(selection.queueId);
      revalidate();
    }
  };

  const getPlayerById = (playerId: string): Player | undefined => {
    return playersData.find((p) => p.player_id === playerId);
  };

  const displayableQueues = client.getDisplayableQueues(queuesData, playersData);
  const activeDisplayQueue = client.getDisplayQueueForMenuBar(activeQueue, playersData, queuesData);
  const inactiveQueues = displayableQueues.filter((q) => q.queue_id !== activeDisplayQueue?.queue_id);
  const activePlayer = activeDisplayQueue ? getPlayerById(activeDisplayQueue.queue_id) : undefined;
  const groupMemberOptions =
    activePlayer && client.canFormGroup(activePlayer)
      ? client.getGroupMemberOptions(activePlayer, playersData)
      : undefined;

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
            onAction={async () =>
              await launchCommand({
                name: "current-track",
                type: LaunchType.UserInitiated,
              })
            }
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
          {client.supportsVolumeControl(getPlayerById(activeDisplayQueue.queue_id)) &&
            activePlayerVolume !== undefined && (
              <>
                <MenuBarExtra.Item
                  title={`${activePlayerVolume}%`}
                  icon={getPlayerById(activeDisplayQueue.queue_id)?.volume_muted ? Icon.SpeakerOff : Icon.SpeakerOn}
                />
                <MenuBarExtra.Submenu title="Set Volume" icon={Icon.SpeakerHigh}>
                  {client.getVolumeOptions().map((option) => (
                    <MenuBarExtra.Item
                      key={option.level}
                      title={option.display}
                      icon={activePlayerVolume === option.level ? Icon.CheckCircle : undefined}
                      onAction={async () => {
                        const controller = await client.createVolumeController(activeDisplayQueue.queue_id);
                        await controller.setVolume(option.level);
                        revalidate();
                      }}
                    />
                  ))}
                </MenuBarExtra.Submenu>
              </>
            )}

          {/* Group Members & Potential Members */}
          {activePlayer &&
            groupMemberOptions &&
            (groupMemberOptions.currentMembers.length > 0 || groupMemberOptions.potentialMembers.length > 0) && (
              <MenuBarExtra.Submenu title="Group Members" icon={Icon.TwoPeople}>
                {groupMemberOptions.currentMembers.map((member) => (
                  <MenuBarExtra.Item
                    key={member.player_id}
                    title={member.display_name}
                    icon={Icon.Minus}
                    onAction={async () => {
                      await client.ungroupPlayer(member.player_id);
                      revalidate();
                    }}
                  />
                ))}
                {groupMemberOptions.potentialMembers.map((player) => (
                  <MenuBarExtra.Item
                    key={player.player_id}
                    title={player.display_name}
                    icon={Icon.Plus}
                    onAction={async () => {
                      await client.groupPlayer(player.player_id, activePlayer.player_id);
                      revalidate();
                    }}
                  />
                ))}
              </MenuBarExtra.Submenu>
            )}
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
              onAction={async () => await selectPlayerForMenuBar(queue)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
    </MenuBarExtra>
  );
}
