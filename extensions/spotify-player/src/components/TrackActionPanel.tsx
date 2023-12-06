import { Action, ActionPanel, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { AlbumTracksList } from "./AlbumTracksList";
import { useYourLibrary } from "../hooks/useYourLibrary";
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
  const library = useYourLibrary();
  const { meData } = useMe();
  const { data: playlists } = usePromise(() => library.getAllPlaylists());

  return (
    <ActionPanel>
      <PlayAction id={track.id as string} type="track" playingContext={playingContext} tracksToQueue={tracksToQueue} />
      {album && showGoToAlbum && (
        <Action.Push
          icon={Icon.AppWindowList}
          title="Go to Album"
          target={<AlbumTracksList album={album} showGoToAlbum={false} />}
        />
      )}
      <StartRadioAction trackId={track.id} />
      {showAddToSaved && <AddToSavedTracksAction track={track} />}
      {track.uri && <AddToQueueAction uri={track.uri} title={title} />}
      {playlists && playlists.length > 0 && meData && track.uri && (
        <AddToPlaylistAction playlists={playlists} meData={meData} uri={track.uri} />
      )}
      <FooterAction url={track?.external_urls?.spotify} uri={track.uri} title={title} />
    </ActionPanel>
  );
}
