import { useEffect, useState } from "react";
import {
  Icon,
  Detail,
  List,
  ActionPanel,
  Action,
  closeMainWindow,
  popToRoot,
  showHUD,
  Color,
  Clipboard,
} from "@raycast/api";
import { useCurrentlyPlaying } from "./hooks/useCurrentlyPlaying";
import { View } from "./components/View";
import { containsMySavedTracks } from "./api/containsMySavedTrack";
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

function NowPlayingCommand() {
  const { currentPlayingData, currentPlayingIsLoading } = useCurrentlyPlaying();
  const { myDevicesData } = useMyDevices();
  const { myPlaylistsData } = useMyPlaylists();
  const [isPaused, setIsPaused] = useState(currentPlayingData?.is_playing === false);
  const [trackAlreadyLiked, setTrackAlreadyLiked] = useState<boolean | null>(null);

  const isTrack = currentPlayingData?.currently_playing_type !== "episode";

  const getTrackAlreadyLiked = async (trackId: string) => {
    const songResponse = await containsMySavedTracks({ trackIds: [trackId] });
    setTrackAlreadyLiked(songResponse[0]);
  };

  useEffect(() => {
    setIsPaused(currentPlayingData?.is_playing === false);
    if (currentPlayingData?.item && isTrack) {
      getTrackAlreadyLiked(currentPlayingData?.item?.id || "");
    }
  }, [currentPlayingData]);

  if (currentPlayingIsLoading) {
    return <Detail isLoading />;
  }

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
              await closeMainWindow();
              await popToRoot();
              showHUD(`Disliked ${name}`);
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
              await closeMainWindow();
              await popToRoot();
              showHUD(`Liked ${name}`);
            }}
          />
        )}
        <Action
          icon={Icon.Forward}
          title="Next"
          shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
          onAction={async () => {
            await skipToNext();
            await closeMainWindow();
            await popToRoot();
          }}
        />

        <Action
          icon={Icon.Rewind}
          title="Previous"
          shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
          onAction={async () => {
            await skipToPrevious();
            await closeMainWindow();
            await popToRoot();
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
            showHUD(`Playing Radio`);
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
      actions={
        <ActionPanel>
          {!isPaused && (
            <Action
              icon={Icon.Pause}
              title="Pause"
              onAction={async () => {
                await pause();
                await closeMainWindow();
                await popToRoot();
              }}
            />
          )}
          {isPaused && (
            <Action
              icon={Icon.Play}
              title="Play"
              onAction={async () => {
                await play();
                await closeMainWindow();
                await popToRoot();
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
                  await closeMainWindow();
                  await popToRoot();
                  showHUD(`Added to ${playlist.name}`);
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
                  await closeMainWindow();
                  await popToRoot();
                  showHUD(`Connected to ${device.name}`);
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
