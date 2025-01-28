import { Action, ActionPanel, Icon } from "@raycast/api";
import { MinimalTrack } from "../api/getMySavedTracks";
import { FooterAction } from "./FooterAction";
import { PlayAction } from "./PlayAction";
import { StartRadioAction } from "./StartRadioAction";
import { AddToSavedTracksAction } from "./AddToSavedTracksAction";
import { TracksList } from "./TracksList";
import { RefreshAction } from "./RefreshAction";
import { memo } from "react";

interface TrackActionPanelProps {
  title: string;
  track: MinimalTrack;
  album: MinimalTrack["album"];
  showGoToAlbum?: boolean;
  onRefresh?: () => void;
}

const AlbumAction = memo(({ album }: { album: MinimalTrack["album"] }) => (
  <Action.Push
    icon={Icon.AppWindowGrid3x3}
    title="Go to Album"
    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    target={
      <TracksList
        album={{
          id: album.id,
          name: album.name,
          images: album.images,
        }}
        showGoToAlbum={false}
      />
    }
  />
));

export function TrackActionPanel({ title, track, album, showGoToAlbum, onRefresh }: TrackActionPanelProps) {
  return (
    <ActionPanel title={title}>
      <ActionPanel.Section>
        <PlayAction id={track.id} type="track" />
        <AddToSavedTracksAction trackId={track.id} />
        <StartRadioAction trackId={track.id} />
        {showGoToAlbum && <AlbumAction album={album} />}
        {onRefresh && <RefreshAction onRefresh={onRefresh} />}
      </ActionPanel.Section>
      <FooterAction url={`https://open.spotify.com/track/${track.id}`} uri={track.uri} title={title} />
    </ActionPanel>
  );
}
