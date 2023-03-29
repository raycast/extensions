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
  Toast,
  getPreferenceValues,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { View } from "./components/View";
import { useMyDevices } from "./hooks/useMyDevices";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { pause } from "./api/pause";
import { play } from "./api/play";
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
import { StartRadioAction } from "./api/StartRadioAction";

function NowPlayingCommand() {
  const { currentPlayingData, currentPlayingIsLoading, currentPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateIsLoading, playbackStateRevalidate } = usePlaybackState();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentPlayingData?.item?.id ? [currentPlayingData?.item?.id] : [],
  });
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isPaused = !currentPlayingData?.is_playing || !playbackStateData?.is_playing;
  const isTrack = currentPlayingData?.currently_playing_type !== "episode";

  if (!currentPlayingData || !currentPlayingData.item) {
    return (
      <List isLoading={currentPlayingIsLoading}>
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
                  currentPlayingRevalidate();
                }}
                shortcut={{ modifiers: ["cmd"], key: "r" }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  const { item } = currentPlayingData;
  const { name, external_urls, uri } = item;

  let title = "";
  let markdown;
  let metadata: JSX.Element | null = null;
  let actions: JSX.Element | null = null;

  if (isTrack) {
    const { album, artists, id: trackId, duration_ms } = item as TrackObject;
    const albumName = album?.name;
    const albumImage = album?.images[0].url;
    const artistName = artists?.[0]?.name;
    const artistId = artists?.[0]?.id;
    title = `${name} · ${artistName}`;

    markdown = `# ${name}
by ${artistName}

![${name}](${albumImage}?raycast-width=250&raycast-height=250)
`;

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

    actions = (
      <>
        {trackAlreadyLiked && (
          <Action
            icon={Icon.HeartDisabled}
            title="Dislike"
            onAction={async () => {
              await removeFromMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              if (closeWindowOnAction) {
                await showHUD(`Disliked ${name}`);
                await popToRoot();
                return;
              }
              await showToast({ title: `Disliked ${name}` });
              await containsMySavedTracksRevalidate();
            }}
          />
        )}

        {!trackAlreadyLiked && (
          <Action
            icon={Icon.Heart}
            title="Like"
            onAction={async () => {
              await addToMySavedTracks({
                trackIds: trackId ? [trackId] : [],
              });
              if (closeWindowOnAction) {
                await showHUD(`Liked ${name}`);
                await popToRoot();
                return;
              }
              await showToast({ title: `Liked ${name}` });
              await containsMySavedTracksRevalidate();
            }}
          />
        )}
        <Action
          icon={Icon.Forward}
          title="Next"
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await skipToNext();
            if (closeWindowOnAction) {
              await showHUD("Skipped to next");
              await popToRoot();
              return;
            }
            await showToast({ title: "Skipped to next" });
            await currentPlayingRevalidate();
          }}
        />

        <Action
          icon={Icon.Rewind}
          title="Previous"
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await skipToPrevious();
            if (closeWindowOnAction) {
              await showHUD("Skipped to previous");
              await popToRoot();
              return;
            }
            await showToast({ title: "Skipped to previous" });
            await currentPlayingRevalidate();
          }}
        />
        <StartRadioAction trackId={trackId} artistId={artistId} revalidate={currentPlayingRevalidate} />
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
    const image = images[0].url;
    title = `${name} · ${showName}`;

    markdown = `# ${showName}
${name}

![${name}](${image}?raycast-width=250&raycast-height=250)

${description}
`;

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
      isLoading={currentPlayingIsLoading || playbackStateIsLoading}
      actions={
        <ActionPanel>
          {!isPaused && (
            <Action
              icon={Icon.Pause}
              title="Pause"
              onAction={async () => {
                if (closeWindowOnAction) {
                  await pause();
                  await showHUD("Paused");
                  await popToRoot();
                  return;
                }
                const toast = await showToast({ title: "Pausing...", style: Toast.Style.Animated });
                await pause();
                await playbackStateRevalidate();
                toast.title = "Paused";
                toast.style = Toast.Style.Success;
              }}
            />
          )}
          {isPaused && (
            <Action
              icon={Icon.Play}
              title="Play"
              onAction={async () => {
                if (closeWindowOnAction) {
                  await play();
                  await showHUD("Playing");
                  await popToRoot();
                  return;
                }
                const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
                await play();
                await playbackStateRevalidate();
                toast.title = "Playing";
                toast.style = Toast.Style.Success;
              }}
            />
          )}
          {actions}
          {myPlaylistsData?.items && meData && uri && (
            <AddToPlaylistAction playlists={myPlaylistsData.items} meData={meData} uri={uri} />
          )}
          <ActionPanel.Submenu icon={Icon.Mobile} title="Connect Device">
            {myDevicesData?.devices?.map((device) => (
              <Action
                key={device.id}
                title={device.name as string}
                icon={device.is_active ? Icon.SpeakerOn : { source: Icon.SpeakerOff, tintColor: Color.SecondaryText }}
                onAction={async () => {
                  if (device.id) {
                    await transferMyPlayback(device.id);
                  }
                  if (closeWindowOnAction) {
                    await showHUD(`Connected to ${device.name}`);
                    await popToRoot();
                    return;
                  }
                  await showToast({ title: `Connected to ${device.name}` });
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
