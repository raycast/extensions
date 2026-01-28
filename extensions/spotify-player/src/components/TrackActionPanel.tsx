import { Action, ActionPanel, Icon } from "@raycast/api";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { TracksList } from "./TracksList";
import { useMyPlaylists } from "../hooks/useMyPlaylists";
import { useMe } from "../hooks/useMe";
import { AddToPlaylistAction } from "./AddToPlaylistAction";
import { FooterAction } from "./FooterAction";
import { AddToQueueAction } from "./AddtoQueueAction";
import { StartRadioAction } from "./StartRadioAction";
import { PlayAction } from "./PlayAction";
import { AddToSavedTracksAction } from "./AddToSavedTracksAction";

type TrackActionPanelProps = {
  title: string;
  track: SimplifiedTrackObject;
  album?: SimplifiedAlbumObject;
  showAddToSaved?: boolean;
  showGoToAlbum?: boolean;
  playingContext?: string;
  tracksToQueue?: SimplifiedTrackObject[];
};

export function TrackActionPanel({
  title,
  track,
  album,
  showAddToSaved,
  showGoToAlbum,
  playingContext,
  tracksToQueue,
}: TrackActionPanelProps) {
  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();

  return (
    <ActionPanel>
      <PlayAction id={track.id as string} type="track" playingContext={playingContext} tracksToQueue={tracksToQueue} />
      {album && showGoToAlbum && (
        <Action.Push
          icon={Icon.AppWindowList}
          title="Go to Album"
          target={<TracksList album={album} showGoToAlbum={false} />}
        />
      )}
      <StartRadioAction trackId={track.id} />
      {showAddToSaved && <AddToSavedTracksAction trackId={track.id} />}
      {track.uri && <AddToQueueAction uri={track.uri} title={title} />}
      {myPlaylistsData?.items && meData && track.uri && (
        <AddToPlaylistAction playlists={myPlaylistsData.items} meData={meData} uri={track.uri} />
      )}
      <FooterAction url={track?.external_urls?.spotify} uri={track.uri} title={title} />
    </ActionPanel>
  );
}
