import { Action, ActionPanel, getPreferenceValues, Icon, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { addToQueue } from "../api/addTrackToQueue";
import { play } from "../api/play";
import { startRadio } from "../api/startRadio";
import { SimplifiedAlbumObject, SimplifiedTrackObject } from "../helpers/spotify.api";
import { TracksList } from "./TracksList";
import { useMyPlaylists } from "../hooks/useMyPlaylists";
import { useMe } from "../hooks/useMe";
import { AddToPlaylistAction } from "./AddToPlaylistAction";
import { FooterAction } from "./FooterAction";
import { AddToQueueAction } from "./AddtoQueueAction";

type TrackActionPanelProps = {
  title: string;
  track: SimplifiedTrackObject;
  album?: SimplifiedAlbumObject;
  showGoToAlbum?: boolean;
  playingContext?: string;
};

export function TrackActionPanel({ title, track, album, showGoToAlbum, playingContext }: TrackActionPanelProps) {
  const { myPlaylistsData } = useMyPlaylists();
  const { meData } = useMe();

  const { closeWindowOnAction } = getPreferenceValues<{ closeWindowOnAction?: boolean }>();

  return (
    <ActionPanel>
      <Action
        icon={Icon.Play}
        title="Play"
        onAction={async () => {
          if (closeWindowOnAction) {
            await play({ id: track.id, type: "track", contextUri: playingContext });
            await showHUD(`Playing ${title}`);
            await popToRoot();
            return;
          }
          const toast = await showToast({ title: "Playing...", style: Toast.Style.Animated });
          await play({ id: track.id, type: "track", contextUri: playingContext });
          toast.title = `Playing ${title}`;
          toast.style = Toast.Style.Success;
        }}
      />
      {album && showGoToAlbum && (
        <Action.Push
          icon={Icon.AppWindowList}
          title="Go to Album"
          target={<TracksList album={album} showGoToAlbum={false} />}
        />
      )}
      <Action
        icon={Icon.Music}
        title="Start Radio"
        onAction={async () => {
          await startRadio({ trackIds: [track.id as string] });
          if (closeWindowOnAction) {
            await showHUD(`Playing ${title} Radio`);
            await popToRoot();
            return;
          }
          await showToast({ title: `Playing ${title} Radio` });
        }}
      />
      {track.uri && <AddToQueueAction uri={track.uri} title={title} closeWindowOnAction={closeWindowOnAction} />}
      {myPlaylistsData?.items && meData && track.uri && (
        <AddToPlaylistAction
          playlists={myPlaylistsData.items}
          meData={meData}
          uri={track.uri}
          closeWindowOnAction={closeWindowOnAction}
        />
      )}
      <FooterAction url={track?.external_urls?.spotify} uri={track.uri} title={title} />
    </ActionPanel>
  );
}
