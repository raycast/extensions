import {
  Icon,
  Detail,
  List,
  ActionPanel,
  Action,
  popToRoot,
  showHUD,
  Color,
  Clipboard,
  showToast,
  Toast,
  getPreferenceValues,
} from "@raycast/api";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { View } from "./components/View";
import { useMyDevices } from "./hooks/useMyDevices";
import { EpisodeObject, TrackObject } from "./helpers/spotify.api";
import { pause } from "./api/pause";
import { play } from "./api/play";
import { skipToNext } from "./api/skipToNext";
import { skipToPrevious } from "./api/skipToPrevious";
import { startRadio } from "./api/startRadio";
import { removeFromMySavedTracks } from "./api/removeFromMySavedTracks";
import { addToMySavedTracks } from "./api/addToMySavedTracks";
import { transferMyPlayback } from "./api/transferMyPlayback";
import { isSpotifyInstalled } from "./helpers/isSpotifyInstalled";
import { useMyPlaylists } from "./hooks/useMyPlaylists";
import { addToPlaylist } from "./api/addToPlaylist";
import { useContainsMyLikedTracks } from "./hooks/useContainsMyLikedTracks";
import { usePlaybackState } from "./hooks/usePlaybackState";

function NowPlayingCommand() {
  const { currentPlayingData, currentPlayingIsLoading, currentPlayingRevalidate } = useCurrentlyPlaying();
  const { playbackStateData, playbackStateIsLoading, revalidatePlaybackState } = usePlaybackState();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const { containsMySavedTracksData, containsMySavedTracksRevalidate } = useContainsMyLikedTracks({
    trackIds: currentPlayingData?.item?.id ? [currentPlayingData?.item?.id] : [],
  });
  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  const trackAlreadyLiked = containsMySavedTracksData?.[0];
  const isPaused = !currentPlayingData?.is_playing || !playbackStateData?.is_playing;
  const isTrack = currentPlayingData?.currently_playing_type !== "episode";

  if (!currentPlayingData || !currentPlayingData.item) {
    return (
      <List>
        <List.EmptyView icon={Icon.Music} title="Nothing is playing right now" />
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
    const { album, artists, id: trackId } = item as TrackObject;
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
        <Detail.Metadata.Label title="Artist" text={artistName} />
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
        <Action
          icon={Icon.Music}
          title="Start Radio"
          onAction={async () => {
            await startRadio({
              trackIds: trackId ? [trackId] : undefined,
              artistIds: artistId ? [artistId] : undefined,
            });
            if (closeWindowOnAction) {
              await showHUD("Playing Radio");
              await popToRoot();
              return;
            }
            await showToast({ title: "Playing Radio" });
            await currentPlayingRevalidate();
          }}
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
                const toast = await showToast({ title: "Pausing", style: Toast.Style.Animated });
                await pause();
                await revalidatePlaybackState();
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
                const toast = await showToast({ title: "Playing", style: Toast.Style.Animated });
                await play();
                await revalidatePlaybackState();
                toast.title = "Playing";
                toast.style = Toast.Style.Success;
              }}
            />
          )}
          {actions}
          <ActionPanel.Submenu icon={Icon.List} title="Add to Playlist">
            {myPlaylistsData?.items?.map((playlist) => (
              <Action
                key={playlist.id}
                title={playlist.name as string}
                onAction={async () => {
                  await addToPlaylist({
                    playlistId: playlist.id as string,
                    trackUris: [uri as string],
                  });
                  if (closeWindowOnAction) {
                    await showHUD(`Added to ${playlist.name}`);
                    await popToRoot();
                    return;
                  }
                  await showToast({ title: `Added to ${playlist.name}` });
                }}
              />
            ))}
          </ActionPanel.Submenu>
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
          <ActionPanel.Section>
            <Action
              title="Copy URL"
              icon={Icon.Link}
              onAction={async () => {
                await Clipboard.copy({
                  html: `<a href=${external_urls?.spotify}>${title}</a>`,
                  text: external_urls?.spotify,
                });
                showHUD("Copied URL to clipboard");
              }}
            />

            {isSpotifyInstalled ? (
              <Action.Open icon="spotify-icon.png" title="Open on Spotify" target={uri || "spotify"} />
            ) : (
              <Action.OpenInBrowser
                title="Open on Spotify Web"
                url={external_urls?.spotify || "https://play.spotify.com"}
              />
            )}
          </ActionPanel.Section>
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
