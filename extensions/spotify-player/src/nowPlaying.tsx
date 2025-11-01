import {
  Icon,
  Detail,
  List,
  ActionPanel,
  Action,
  popToRoot,
  showHUD,
  Color,
  showToast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
  Toast,
} from "@raycast/api";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { View } from "./components/View";
import { useMyDevices } from "./hooks/useMyDevices";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { transferMyPlayback } from "./api/transferMyPlayback";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { useMe } from "./hooks/useMe";
import { useContainsMyLikedTracks } from "./hooks/useContainsMyLikedTracks";
import { usePlaybackState } from "./hooks/usePlaybackState";
import { formatMs } from "./helpers/formatMs";
import { TracksList } from "./components/TracksList";
import { AddToPlaylistAction } from "./components/AddToPlaylistAction";
import { FooterAction } from "./components/FooterAction";
import { StartRadioAction } from "./components/StartRadioAction";
import { PlayAction } from "./components/PlayAction";
import { PauseAction } from "./components/PauseAction";
import { getErrorMessage } from "./helpers/getError";

function NowPlayingCommand() {
  const { currentlyPlayingData, currentlyPlayingIsLoading, currentlyPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateIsLoading, playbackStateRevalidate } = usePlaybackState();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentlyPlayingData?.item?.id ? [currentlyPlayingData?.item?.id] : [],
  });
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isPlaying = playbackStateData?.is_playing;
  const isTrack = currentlyPlayingData?.currently_playing_type !== "episode";

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
              />
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => launchCommand({ name: "search", type: LaunchType.UserInitiated })}
              />
              <Action
                icon={Icon.Repeat}
                title="Refresh"
                onAction={async () => {
                  currentlyPlayingRevalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
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

    metadata = (
      <Detail.Metadata>
        <Detail.Metadata.Label title="Track" text={name} />
        {duration_ms && <Detail.Metadata.Label title="Duration" text={formatMs(duration_ms)} />}
        {artists && artists.length > 1 && (
          <Detail.Metadata.Label title="Artists" text={artists.map((a) => a.name).join(", ")} />
        )}
        {artists && artists.length === 1 && <Detail.Metadata.Label title="Artist" text={artistName} />}
        <Detail.Metadata.Label title="Album" text={albumName} />
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
          />
        )}
        <Action
          icon={Icon.Forward}
          title="Next"
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            try {
              await skipToNext();
              await launchCommand({ name: "nowPlayingMenuBar", type: LaunchType.Background });
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
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            try {
              await skipToPrevious();
              await launchCommand({ name: "nowPlayingMenuBar", type: LaunchType.Background });
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
      isLoading={currentlyPlayingIsLoading || playbackStateIsLoading}
      actions={
        <ActionPanel>
          {isPlaying && <PauseAction onPause={() => playbackStateRevalidate()} />}
          {!isPlaying && <PlayAction onPlay={() => playbackStateRevalidate()} />}
          {trackOrEpisodeActions}
          {myPlaylistsData?.items && meData && uri && (
            <AddToPlaylistAction playlists={myPlaylistsData.items} meData={meData} uri={uri} />
          )}
          <ActionPanel.Submenu icon={Icon.Mobile} title="Connect Device">
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
                        await transferMyPlayback(device.id);
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
