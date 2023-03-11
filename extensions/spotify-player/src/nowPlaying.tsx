import { useEffect, useState } from "react";
import { showToast, Toast, Icon, Detail, List } from "@raycast/api";
import { useCurrentPlayingTrack } from "./hooks/useCurrentPlayingTrack";
import View from "./components/View";
import { NowPlayingActionPanel } from "./components/NowPlayingActionPanel";
import { containsMySavedTracks } from "./api/containsMySavedTrack";
import { isTrack } from "./helpers/track";

function NowPlayingCommand() {
  const { currentPlayingData, currentPlayingError, currentPlayingIsLoading } =
    useCurrentPlayingTrack();
  const [isPaused, setIsPaused] = useState(currentPlayingData?.is_playing === false);
  const [songAlreadyLiked, setSongAlreadyLiked] = useState<boolean | null>(null);

  const trackAlreadyLiked = async (trackId: string) => {
    const songResponse = await containsMySavedTracks({ trackIds: [trackId] });
    setSongAlreadyLiked(songResponse[0]);
  };

  useEffect(() => {
    setIsPaused(currentPlayingData?.is_playing === false);
    if (
      currentPlayingData &&
      Object.keys(currentPlayingData).length > 0 &&
      isTrack(currentPlayingData)
    ) {
      trackAlreadyLiked(currentPlayingData.item.id);
    }
  }, [currentPlayingData]);

  if (currentPlayingError) {
    showToast(Toast.Style.Failure, "Now Playing has failed", currentPlayingError.message);
  }

  if (currentPlayingIsLoading) {
    return <Detail isLoading />;
  }

  const isIdle = currentPlayingData && Object.keys(currentPlayingData).length === 0;

  if (isIdle) {
    return (
      <List>
        <List.EmptyView icon={Icon.XMarkCircle} title="Nothing is playing right now" />
      </List>
    );
  }

  if (!currentPlayingData) {
    return <Detail markdown={`# Something is wrong`} />;
  }

  if (!isTrack(currentPlayingData)) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.ExclamationMark}
          title="Podcasts are not supported at the moment"
        />
      </List>
    );
  }

  const { item } = currentPlayingData;
  const { name: trackName, album, artists, id: trackId, external_urls } = item;

  const albumName = album.name;
  const albumImage = album.images[0].url;
  const artistName = artists[0]?.name;
  const artistId = artists[0]?.id;

  const markdown = `# ${trackName}
by ${artistName}

![${trackName}](${albumImage}?raycast-width=250&raycast-height=250)
`;

  return (
    <Detail
      markdown={markdown}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Track" text={trackName} />
          <Detail.Metadata.Label title="Artist" text={artistName} />
          <Detail.Metadata.Label title="Album" text={albumName} />
        </Detail.Metadata>
      }
      actions={
        <NowPlayingActionPanel
          isPaused={isPaused}
          trackId={trackId}
          artistId={artistId}
          trackName={trackName}
          artistName={artistName}
          songAlreadyLiked={songAlreadyLiked}
          trackUrl={external_urls.spotify}
        />
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
