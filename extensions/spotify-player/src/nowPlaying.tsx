import {
  Icon,
  Detail,
  List,
  ActionPanel,
  Action,
  popToRoot,
  showHUD,
  Color,
  Image,
  showToast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  Toast,
  Keyboard,
} from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { View } from "./components/View";
import { useMyDevices } from "./hooks/useMyDevices";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { useMe } from "./hooks/useMe";
import { useContainsMyLikedTracks } from "./hooks/useContainsMyLikedTracks";
import { usePlaylistsContainingTrack } from "./hooks/usePlaylistsContainingTrack";
import { formatMs } from "./helpers/formatMs";
import { TracksList } from "./components/TracksList";
import { AddToPlaylistAction } from "./components/AddToPlaylistAction";
import { FooterAction } from "./components/FooterAction";
import { StartRadioAction } from "./components/StartRadioAction";
import { getPlaybackState } from "./api/getPlaybackState";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { invalidateCache } from "./helpers/apiCache";
import { getErrorMessage } from "./helpers/getError";
import { triggerMenuBarRefresh } from "./helpers/triggerMenuBarRefresh";
import { ConnectDevice, Dislike, Like, OpenLibrary, OpenSearch, ShowContent } from "./shortcuts/shortcuts";

async function sendPlaying(playing: boolean) {
  try {
    await (playing ? play() : pause());
  } catch (err) {
    // Spotify rejects the command if playback is already in that state, e.g. after a change on another device.
    const state = await getPlaybackState().catch(() => undefined);
    if (state?.is_playing !== playing) throw err;
  }
}

// Play can take longer than Pause to send its command, for example while it looks up devices, so a quick Play then
// Pause could reach Spotify in the wrong order. Each command waits for the previous one, so they're sent in the order
// they were pressed.
let previousCommand = Promise.resolve();

function setPlaying(playing: boolean) {
  const command = previousCommand.then(() => sendPlaying(playing));
  previousCommand = command.catch(() => undefined);
  return command;
}

function NowPlayingCommand() {
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate, currentlyPlayingMutate } =
    useCurrentlyPlaying();

  // Defer secondary API calls until primary data is loaded.
  // On initial mount only currentlyPlaying fires (1 API call).
  // Devices, playlists, and user profile load on next render once we have track data.
  const hasTrackData = !!currentlyPlayingData?.item;
  const { myDevicesData, myDevicesConnect } = useMyDevices({ options: { execute: hasTrackData } });
  const { myPlaylistsData } = useMyPlaylists({ options: { execute: hasTrackData } });
  const { meData } = useMe({ options: { execute: hasTrackData } });
  const {
    containsMySavedTracksData,
    containsMySavedTracksError,
    containsMySavedTracksIsLoading,
    containsMySavedTracksRevalidate,
  } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
  });

  const ownedPlaylists = myPlaylistsData?.items?.filter((p) => p.owner?.id === meData?.id) ?? [];
  const { playlistsContainingTrack } = usePlaylistsContainingTrack({
    playlists: ownedPlaylists,
    trackUri: currentlyPlayingData?.item?.uri,
    options: { execute: hasTrackData && ownedPlaylists.length > 0 },
  });

  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isPlaying = currentlyPlayingData?.is_playing;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

  const togglePlayback = async () => {
    const playing = !isPlaying;
    try {
      await currentlyPlayingMutate(setPlaying(playing), {
        optimisticUpdate: (data) => data && { ...data, is_playing: playing },
        // Spotify can briefly report the old state after a change, so don't refetch. The exception is a read
        // still loading from before the change: refetching discards it, so it can't overwrite the new state.
        shouldRevalidateAfter: currentlyPlayingIsLoading,
      });
      const title = playing ? "Playing" : "Paused";
      if (closeWindowOnAction) {
        await showHUD(title);
        await popToRoot();
        return;
      }
      await showToast({ title });
    } catch (err) {
      const title = playing ? "Failed to play" : "Failed to pause";
      if (closeWindowOnAction) {
        await showHUD(title);
        await popToRoot();
        return;
      }
      await showFailureToast(err, { title });
    }
  };

  if (!currentlyPlayingData || !currentlyPlayingData.item) {
    return (
      <List isLoading={currentlyPlayingIsLoading}>
        <List.EmptyView
          icon={Icon.Music}
          title="Nothing is playing right now"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Book}
                title="Your Library"
                onAction={() => launchCommand({ name: "yourLibrary", type: LaunchType.UserInitiated })}
                shortcut={OpenLibrary}
              />
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
                shortcut={OpenSearch}
              />
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  invalidateCache("api:currently-playing");
                  currentlyPlayingRevalidate();
                }}
                shortcut={Keyboard.Shortcut.Common.Refresh}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { item } = currentlyPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let markdown;
  let metadata: React.JSX.Element | null = null;
  let trackOrEpisodeActions: React.JSX.Element | null = null;

  if (isTrack) {
    const { album, artists, id: trackId, duration_ms } = item as TrackObject;
    const albumName = album?.name;
    const albumImage = album?.images[0]?.url;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = `${name} · ${artistName}`;

    markdown = [
      `# ${name}`,
      `by ${artistName}`,
      "",
      albumImage ? `![${name}](${albumImage}?raycast-width=250&raycast-height=250)` : "",
    ].join("\n");

    const inPlaylists = ownedPlaylists.filter((p) => p.id && playlistsContainingTrack.includes(p.id));

    metadata = (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Track" text={name} />
        {duration_ms && <Detail.Metadata.Label title="Duration" text={formatMs(duration_ms)} />}
        {artists && artists.length > 1 && (
          <Detail.Metadata.Label title="Artists" text={artists.map((a) => a.name).join(", ")} />
        )}
        {artists && artists.length === 1 && <Detail.Metadata.Label title="Artist" text={artistName} />}
        <Detail.Metadata.Label title="Album" text={albumName} />
        <Detail.Metadata.Label
          title="Liked"
          text={
            containsMySavedTracksError
              ? "Unknown"
              : containsMySavedTracksIsLoading
                ? "Checking…"
                : trackAlreadyLiked
                  ? "Yes"
                  : "No"
          }
          icon={
            containsMySavedTracksError
              ? { source: Icon.QuestionMark, tintColor: Color.SecondaryText }
              : containsMySavedTracksIsLoading
                ? { source: Icon.Clock, tintColor: Color.SecondaryText }
                : trackAlreadyLiked
                  ? { source: Icon.Heart, tintColor: Color.Red }
                  : { source: Icon.HeartDisabled, tintColor: Color.SecondaryText }
          }
        />
        {inPlaylists.length > 0 && (
          <Detail.Metadata.TagList title="In Playlists">
            {inPlaylists.map((p) => (
              <Detail.Metadata.TagList.Item
                key={p.id}
                text={p.name ?? ""}
                icon={p.images?.[0]?.url ? { source: p.images[0].url, mask: Image.Mask.RoundedRectangle } : undefined}
              />
            ))}
          </Detail.Metadata.TagList>
        )}
      </Detail.Metadata>
    );

    trackOrEpisodeActions = (
      <>
        {trackAlreadyLiked && (
          <Action
            icon={Icon.HeartDisabled}
            title="Dislike"
            onAction={async () => {
              if (closeWindowOnAction) {
                try {
                  await removeFromMySavedTracks({
                    trackIds: trackId ? [trackId] : [],
                  });
                  await showHUD("Disliked");
                  await popToRoot();
                  return;
                } catch (err) {
                  const error = getErrorMessage(err);
                  await showHUD(error);
                }
              }
              const toast = await showToast({ title: "Disliking...", style: Toast.Style.Animated });
              try {
                await removeFromMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await containsMySavedTracksRevalidate();
                toast.title = "Disliked";
                toast.style = Toast.Style.Success;
              } catch (err) {
                const error = getErrorMessage(err);
                toast.style = Toast.Style.Failure;
                toast.title = "Something went wrong";
                toast.message = error;
              }
            }}
            shortcut={Dislike}
          />
        )}

        {!trackAlreadyLiked && (
          <Action
            icon={Icon.Heart}
            title="Like"
            onAction={async () => {
              if (closeWindowOnAction) {
                try {
                  await addToMySavedTracks({
                    trackIds: trackId ? [trackId] : [],
                  });
                  await showHUD("Liked");
                  await popToRoot();
                  return;
                } catch (err) {
                  const error = getErrorMessage(err);
                  await showHUD(error);
                }
              }
              const toast = await showToast({ title: "Liking...", style: Toast.Style.Animated });
              try {
                await addToMySavedTracks({
                  trackIds: trackId ? [trackId] : [],
                });
                await containsMySavedTracksRevalidate();
                toast.title = "Liked";
                toast.style = Toast.Style.Success;
              } catch (err) {
                const error = getErrorMessage(err);
                toast.style = Toast.Style.Failure;
                toast.title = "Something went wrong";
                toast.message = error;
              }
            }}
            shortcut={Like}
          />
        )}
        <Action
          icon={Icon.Forward}
          title="Next"
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "arrowRight" },
            Windows: { modifiers: ["ctrl"], key: "arrowRight" },
          }}
          onAction={async () => {
            try {
              await skipToNext();
              triggerMenuBarRefresh();
              if (closeWindowOnAction) {
                await showHUD("Skipped to next");
                await popToRoot();
                return;
              }
              await showToast({ title: "Skipped to next" });
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              if (closeWindowOnAction) {
                await showHUD(error);
                await popToRoot();
                return;
              }
              await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error });
            }
          }}
        />

        <Action
          icon={Icon.Rewind}
          title="Previous"
          shortcut={{
            macOS: { modifiers: ["cmd"], key: "arrowLeft" },
            Windows: { modifiers: ["ctrl"], key: "arrowLeft" },
          }}
          onAction={async () => {
            try {
              await skipToPrevious();
              triggerMenuBarRefresh();
              if (closeWindowOnAction) {
                await showHUD("Skipped to previous");
                await popToRoot();
                return;
              }
              await showToast({ title: "Skipped to previous" });
              await currentlyPlayingRevalidate();
            } catch (err) {
              const error = getErrorMessage(err);
              if (closeWindowOnAction) {
                await showHUD(error);
                await popToRoot();
                return;
              }
              await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error });
            }
          }}
        />
        <StartRadioAction trackId={trackId} artistId={artistId} onRadioStarted={() => currentlyPlayingRevalidate()} />
        <Action.Push
          icon={Icon.AppWindowGrid3x3}
          title="Go to Album"
          target={<TracksList album={album} showGoToAlbum={false} />}
          shortcut={ShowContent}
        />
      </>
    );
  } else {
    const { images, description, show } = item as EpisodeObject;
    const showName = show.name;
    const image = images[0]?.url;
    title = `${name} · ${showName}`;

    markdown = [
      `# ${showName}`,
      name,
      "",
      image ? `![${name}](${image}?raycast-width=250&raycast-height=250)` : "",
      "",
      description,
    ].join("\n");

    metadata = (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Title" text={name} />
        <Detail.Metadata.Label title="Name" text={showName} />
        <Detail.Metadata.Label title="About" text={show.description} />
      </Detail.Metadata>
    );
  }

  return (
    <Detail
      markdown={markdown}
      metadata={metadata}
      isLoading={currentlyPlayingIsLoading}
      actions={
        <ActionPanel>
          <Action
            icon={isPlaying ? Icon.Pause : Icon.Play}
            title={isPlaying ? "Pause" : "Play"}
            onAction={togglePlayback}
          />
          {trackOrEpisodeActions}
          {uri && <AddToPlaylistAction uri={uri} />}
          <ActionPanel.Submenu icon={Icon.Mobile} title="Connect Device" shortcut={ConnectDevice}>
            {myDevicesData?.devices
              ?.filter((device) => !device.is_restricted)
              .map((device) => (
                <Action
                  key={device.id}
                  title={device.name as string}
                  icon={device.is_active ? Icon.SpeakerOn : { source: Icon.SpeakerOff, tintColor: Color.SecondaryText }}
                  onAction={async () => {
                    try {
                      if (device.id) {
                        await myDevicesConnect(device.id);
                      }
                      if (closeWindowOnAction) {
                        await showHUD(`Connected to ${device.name}`);
                        await popToRoot();
                        return;
                      }
                      await showToast({ title: `Connected to ${device.name}` });
                    } catch (err) {
                      const error = getErrorMessage(err);
                      if (closeWindowOnAction) {
                        await showHUD(error);
                        await popToRoot();
                        return;
                      }
                      await showToast({ style: Toast.Style.Failure, title: "Something went wrong", message: error });
                    }
                  }}
                />
              ))}
          </ActionPanel.Submenu>
          <FooterAction url={external_urls?.spotify} uri={uri} title={title} />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  return (
    <View>
      <NowPlayingCommand />
    </View>
  );
}
