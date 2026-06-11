import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant/music-assistant-client";
import { getSelectedQueueID } from "./player-selection/use-selected-player-id";
import { Album, Track } from "./music-assistant/external-code/interfaces";
import { commandOrControlShortcut } from "./shortcuts/shortcuts";
import {
  formatAlbumTypeLabel,
  getCurrentTrackMarkdown,
  getFavoriteActionTitle,
  getFavoriteToastTitle,
  getShuffleToastMessage,
  getTrackPositionLabel,
} from "./current-track/current-track-helpers";

export default function CurrentTrackCommand() {
  const client = new MusicAssistantClient();

  const { isLoading: queueIdLoading, data: storedQueueId } = usePromise(async () => await getSelectedQueueID(), []);

  const {
    isLoading: queueLoading,
    data: queueData,
    revalidate,
  } = usePromise(
    async (queueId: string) => {
      // Fetch the specific queue for the selected player
      return await client.getPlayerQueue(queueId);
    },
    [storedQueueId ?? ""],
    {
      execute: Boolean(storedQueueId),
    },
  );
  const currentItemUri = queueData?.current_item?.media_item?.uri;
  const {
    isLoading: resolvedCurrentItemLoading,
    data: resolvedCurrentItem,
    revalidate: revalidateResolvedCurrentItem,
  } = usePromise(
    async (uri: string) => {
      // Resolve the current queue item to fresh library metadata (favorite status can be stale in queue snapshots).
      return await client.getItemByUri(uri);
    },
    [currentItemUri ?? ""],
    {
      execute: Boolean(currentItemUri),
    },
  );

  const refreshCurrentTrackState = async () => {
    await Promise.all([revalidate(), currentItemUri ? revalidateResolvedCurrentItem() : Promise.resolve(undefined)]);
  };

  /**
   * Toggles shuffle mode on the current queue
   * Shows success/failure feedback via toast notification and refreshes queue data
   */
  const toggleShuffle = async () => {
    if (!queueData) return;
    try {
      const wasEnabled = queueData.shuffle_enabled;
      await client.toggleShuffle(queueData.queue_id, wasEnabled);
      await showToast({
        style: Toast.Style.Success,
        title: "Shuffle Toggled",
        message: getShuffleToastMessage(wasEnabled),
      });
      await refreshCurrentTrackState();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Shuffle",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  /**
   * Cycles through repeat modes (OFF → ONE → ALL → OFF)
   * Shows success/failure feedback via toast notification and refreshes queue data
   */
  const cycleRepeat = async () => {
    if (!queueData) return;
    try {
      const currentMode = queueData.repeat_mode;
      await client.cycleRepeatMode(queueData.queue_id, currentMode);
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Changed",
        message: `Repeat mode set to ${client.getNextRepeatModeLabel(currentMode)}`,
      });
      await refreshCurrentTrackState();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Change Repeat Mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  /**
   * Toggles favorite status for the current track
   * Shows success/failure feedback via toast notification and refreshes queue data
   */
  const toggleFavorite = async () => {
    const mediaItem = resolvedCurrentItem ?? queueData?.current_item?.media_item;
    if (!mediaItem) return;

    try {
      const wasFavorite = resolvedCurrentItem?.favorite ?? mediaItem.favorite;
      await client.toggleFavorite(mediaItem);
      await showToast({
        style: Toast.Style.Success,
        title: getFavoriteToastTitle(wasFavorite),
        message: queueData?.current_item?.name,
      });
      await refreshCurrentTrackState();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Toggle Favorite",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  /**
   * Adds the current track to a specified playlist
   * @param playlistId - The ID of the target playlist
   * @param playlistName - The name of the playlist for display in toast messages
   * Shows success/failure feedback via toast notification
   */
  const addToPlaylist = async (playlistId: string | number, playlistName: string) => {
    if (!queueData?.current_item?.media_item) return;
    try {
      await client.addTracksToPlaylist(playlistId, [queueData.current_item.media_item.uri]);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Playlist",
        message: `"${queueData.current_item.name}" added to "${playlistName}"`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Playlist",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const { data: playlists } = useCachedPromise(() => client.getLibraryPlaylists(undefined, 20, 0), [], {
    keepPreviousData: true,
    initialData: [],
  });

  // If no queue selected, getSelectedQueueID already redirects to set-active-player
  if (!storedQueueId) {
    return <Detail isLoading={queueIdLoading} markdown="# Loading...\n\nFetching your player selection..." />;
  }

  const isCurrentTrackFavorite =
    resolvedCurrentItem?.favorite ?? queueData?.current_item?.media_item?.favorite ?? false;

  // Build markdown content for the detail view (left column with album art and title)
  const buildMarkdown = (): string => {
    return getCurrentTrackMarkdown(
      queueData?.current_item?.name,
      queueData ? client.getQueueAlbumArt(queueData) : undefined,
    );
  };

  /**
   * Builds the metadata panel displayed on the right side of the detail view
   * Shows artist, album, duration, queue info, and playback settings
   * @returns Metadata component or null if no track is playing
   */
  const buildMetadata = () => {
    if (!queueData?.current_item) {
      return null;
    }

    const item = queueData.current_item;
    const mediaItem = item.media_item;
    const duration = client.formatDuration(item.duration);

    // Type guard to check if media item is a Track
    const isTrack = mediaItem?.media_type === "track";
    const trackItem = isTrack ? (mediaItem as Track) : null;

    // Type guard to check if album has full metadata (Album type vs ItemMapping)
    const albumItem = trackItem?.album && "metadata" in trackItem.album ? (trackItem.album as Album) : null;

    const trackPosition = getTrackPositionLabel(trackItem);

    return (
      <Detail.Metadata>
        {trackItem?.artists && trackItem.artists.length > 0 && (
          <Detail.Metadata.Label title="Artist" text={trackItem.artists.map((artist) => artist.name).join(", ")} />
        )}

        {trackItem?.album && <Detail.Metadata.Label title="Album" text={trackItem.album.name} />}

        {albumItem?.year && <Detail.Metadata.Label title="Year" text={albumItem.year.toString()} />}

        {albumItem?.album_type && (
          <Detail.Metadata.Label title="Album Type" text={formatAlbumTypeLabel(albumItem.album_type)} />
        )}

        {trackPosition && <Detail.Metadata.Label title="Position" text={trackPosition} />}

        {albumItem?.metadata?.genres && albumItem.metadata.genres.length > 0 && (
          <Detail.Metadata.TagList title="Genres">
            {albumItem.metadata.genres.map((genre: string, index: number) => (
              <Detail.Metadata.TagList.Item key={index} text={genre} />
            ))}
          </Detail.Metadata.TagList>
        )}

        {albumItem?.metadata?.label && <Detail.Metadata.Label title="Label" text={albumItem.metadata.label} />}

        <Detail.Metadata.Label title="Duration" text={duration} />

        {mediaItem?.metadata?.explicit && (
          <Detail.Metadata.TagList title="Content">
            <Detail.Metadata.TagList.Item text="Explicit" color="#FF0000" />
          </Detail.Metadata.TagList>
        )}

        <Detail.Metadata.Separator />

        <Detail.Metadata.Label title="Queue" text={queueData.display_name} />

        <Detail.Metadata.Label title="State" text={queueData.state.toUpperCase()} />

        <Detail.Metadata.Separator />

        <Detail.Metadata.Label title="Shuffle" text={queueData.shuffle_enabled ? "Enabled" : "Disabled"} />

        <Detail.Metadata.Label title="Repeat" text={client.getRepeatText(queueData.repeat_mode)} />
      </Detail.Metadata>
    );
  };

  return (
    <Detail
      isLoading={queueIdLoading || queueLoading || (Boolean(currentItemUri) && resolvedCurrentItemLoading)}
      markdown={buildMarkdown()}
      navigationTitle="Current Track"
      metadata={buildMetadata()}
      actions={
        <ActionPanel>
          {queueData && (
            <>
              {queueData.current_item && (
                <ActionPanel.Section title="Track Actions">
                  <Action
                    title={getFavoriteActionTitle(isCurrentTrackFavorite)}
                    icon={Icon.Heart}
                    onAction={toggleFavorite}
                    shortcut={commandOrControlShortcut("f")}
                  />
                  {playlists && playlists.length > 0 && (
                    <ActionPanel.Submenu
                      title="Add to Playlist"
                      icon={Icon.Plus}
                      shortcut={commandOrControlShortcut("p")}
                    >
                      {playlists.map((playlist) => (
                        <Action
                          key={playlist.item_id}
                          title={playlist.name}
                          onAction={() => addToPlaylist(playlist.item_id, playlist.name)}
                        />
                      ))}
                    </ActionPanel.Submenu>
                  )}
                </ActionPanel.Section>
              )}

              <ActionPanel.Section title="Queue Controls">
                <Action
                  title="Toggle Shuffle"
                  icon={Icon.Shuffle}
                  onAction={toggleShuffle}
                  shortcut={commandOrControlShortcut("s")}
                />
                <Action
                  title="Cycle Repeat Mode"
                  icon={Icon.Repeat}
                  onAction={cycleRepeat}
                  shortcut={commandOrControlShortcut("r")}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Refresh">
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshCurrentTrackState}
                  shortcut={commandOrControlShortcut("l")}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
