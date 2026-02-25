import { Action, ActionPanel, Detail, Icon, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import MusicAssistantClient from "./music-assistant-client";
import { getSelectedQueueID } from "./use-selected-player-id";
import { Album, RepeatMode, Track } from "./external-code/interfaces";

export default function CurrentTrackCommand() {
  const client = new MusicAssistantClient();

  const { isLoading: queueIdLoading, data: storedQueueId } = useCachedPromise(
    async () => await getSelectedQueueID(),
    [],
  );

  // If no queue selected, getSelectedQueueID already redirects to set-active-player
  if (!storedQueueId) {
    return <Detail isLoading={queueIdLoading} markdown="# Loading...\n\nFetching your player selection..." />;
  }

  const {
    isLoading,
    data: queueData,
    revalidate,
  } = useCachedPromise(
    async (queueId: string) => {
      // Fetch the specific queue for the selected player
      return await client.getPlayerQueue(queueId);
    },
    [storedQueueId],
    {
      keepPreviousData: true,
    },
  );

  /**
   * Toggles shuffle mode on the current queue
   * Shows success/failure feedback via toast notification and refreshes queue data
   */
  const toggleShuffle = async () => {
    if (!queueData) return;
    try {
      const wasEnabled = queueData.shuffle_enabled;
      await client.toggleShuffle(queueData.queue_id);
      await showToast({
        style: Toast.Style.Success,
        title: "Shuffle Toggled",
        message: wasEnabled ? "Shuffle disabled" : "Shuffle enabled",
      });
      revalidate();
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
      await client.cycleRepeatMode(queueData.queue_id);
      const nextMode =
        queueData.repeat_mode === RepeatMode.OFF ? "ONE" : queueData.repeat_mode === RepeatMode.ONE ? "ALL" : "OFF";
      await showToast({
        style: Toast.Style.Success,
        title: "Repeat Mode Changed",
        message: `Repeat mode set to ${nextMode}`,
      });
      revalidate();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Change Repeat Mode",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  /**
   * Adds the current track to favorites
   * Shows success/failure feedback via toast notification
   */
  const addToFavorites = async () => {
    if (!queueData?.current_item?.media_item) return;
    try {
      await client.addToFavorites(queueData.current_item.media_item.uri);
      await showToast({
        style: Toast.Style.Success,
        title: "Added to Favorites",
        message: queueData.current_item.name,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Add to Favorites",
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

  // Build markdown content for the detail view (left column with album art and title)
  const buildMarkdown = (): string => {
    if (!queueData?.current_item) {
      return "# No Track Playing\n\nNo track is currently playing on the selected player.";
    }

    const item = queueData.current_item;
    const albumArt = client.getQueueAlbumArt(queueData);

    let markdown = "";

    // Album artwork
    if (albumArt) {
      markdown += `![Album Art](${albumArt}?raycast-width=220&raycast-height=220)\n\n`;
    }

    // Track title
    markdown += `# ${item.name}\n\n`;

    return markdown;
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

    // Helper to format album type for display
    const formatAlbumType = (type: string): string => {
      return type.charAt(0).toUpperCase() + type.slice(1);
    };

    // Helper to format track position - only available for Track media type
    const getTrackPosition = (): string | null => {
      if (!trackItem) return null;
      const parts: string[] = [];
      if (trackItem.disc_number) {
        parts.push(`Disc ${trackItem.disc_number}`);
      }
      if (trackItem.track_number) {
        parts.push(`Track ${trackItem.track_number}`);
      }
      return parts.length > 0 ? parts.join(", ") : null;
    };

    return (
      <Detail.Metadata>
        {trackItem?.artists && trackItem.artists.length > 0 && (
          <Detail.Metadata.Label
            title="Artist"
            text={trackItem.artists.map((a: { name: string }) => a.name).join(", ")}
          />
        )}

        {trackItem?.album && <Detail.Metadata.Label title="Album" text={trackItem.album.name} />}

        {albumItem?.year && <Detail.Metadata.Label title="Year" text={albumItem.year.toString()} />}

        {albumItem?.album_type && (
          <Detail.Metadata.Label title="Album Type" text={formatAlbumType(albumItem.album_type)} />
        )}

        {getTrackPosition() && <Detail.Metadata.Label title="Position" text={getTrackPosition()!} />}

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
      isLoading={isLoading}
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
                    title="Add to Favorites"
                    icon={Icon.Heart}
                    onAction={addToFavorites}
                    shortcut={{ modifiers: ["cmd"], key: "f" }}
                  />
                  {playlists && playlists.length > 0 && (
                    <ActionPanel.Submenu
                      title="Add to Playlist"
                      icon={Icon.Plus}
                      shortcut={{ modifiers: ["cmd"], key: "p" }}
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
                  shortcut={{ modifiers: ["cmd"], key: "s" }}
                />
                <Action
                  title="Cycle Repeat Mode"
                  icon={Icon.Repeat}
                  onAction={cycleRepeat}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
              </ActionPanel.Section>

              <ActionPanel.Section title="Refresh">
                <Action
                  title="Reload"
                  icon={Icon.ArrowClockwise}
                  onAction={revalidate}
                  shortcut={{ modifiers: ["cmd"], key: "l" }}
                />
              </ActionPanel.Section>
            </>
          )}
        </ActionPanel>
      }
    />
  );
}
